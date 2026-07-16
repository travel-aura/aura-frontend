"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { apiGet } from "@/lib/api";
import { searchPlaces } from "@/lib/geocoding";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { useLanguage } from "@/hooks/useLanguage";
import { TAG_GROUPS, translateTag, translateGroupLabel, t } from "@/lib/i18n";
import { useUpload } from "@/context/UploadContext";
import type { PlaceFeedItem, PlacesFeedResponse } from "../../shared/aura-schema";

const RADIUS = 5000;
const LIMIT = 10;
const FEED_CACHE_KEY = 'aura_feed_cache';
const clearFeedCache = () => { try { sessionStorage.removeItem(FEED_CACHE_KEY); } catch {} };

// ── Icons ─────────────────────────────────────────────────────────────────────

function LayersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L2 7l10 5 10-5-10-5z" opacity="0.6" />
      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" />
    </svg>
  );
}

function NearMeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
    </svg>
  );
}

function SlidersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
      <circle cx="8" cy="6" r="2" fill="currentColor" stroke="none" /><circle cx="16" cy="12" r="2" fill="currentColor" stroke="none" /><circle cx="10" cy="18" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface LocationSuggestion {
  id: string;
  name: string;
  place_name: string;
  lat: number;
  lng: number;
}

interface Coords { lat: number; lng: number; }

type LocationMode = "global" | "nearby" | "city" | "text";

// ── Feed Card ─────────────────────────────────────────────────────────────────

function FeedCard({ place }: { place: PlaceFeedItem }) {
  if (!place.cover_post_id || !place.cover_image_url) return null;
  return (
    <Link href={`/post/${place.cover_post_id}`} className="block">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-[#D4C4A8]">
        <Image src={place.cover_image_url} alt={place.cover_title ?? ""} fill className="object-cover" sizes="(max-width: 768px) 50vw, 33vw" />

        {/* Multiple shots indicator */}
        {place.shot_count > 1 && (
          <div className="absolute left-2 top-2">
            <LayersIcon className="size-5 text-white drop-shadow-lg" />
          </div>
        )}

        {/* Verified badge */}
        {place.verified_count > 0 && (
          <div className="absolute right-2 top-2 flex items-center justify-center rounded-full bg-[#D4C4A8] px-1.5 py-0.5 text-[11px] leading-none drop-shadow">
            📍
          </div>
        )}

        {/* Gradient scrim + title */}
        <div className="absolute inset-x-0 bottom-0 rounded-b-lg bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-2.5 pt-8">
          <p className="line-clamp-2 text-[13px] font-semibold leading-tight text-white drop-shadow">
            {place.cover_title}
          </p>
        </div>
      </div>
    </Link>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = "all" | "following";

export default function AuraFeed() {
  const [activeTab, setActiveTab] = useState<Tab>("all");

  // Location state
  const [locationMode, setLocationMode] = useState<LocationMode>("global");
  const [userCoords, setUserCoords] = useState<Coords | null>(null);
  const [nearMeLoading, setNearMeLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState<{ name: string } & Coords | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Language
  const { language } = useLanguage();

  // Re-fetch when a background upload finishes
  const { status: uploadStatus } = useUpload();

  // Tag filter
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [showTagFilter, setShowTagFilter] = useState(false);

  // Feed state
  const [places, setPlaces] = useState<PlaceFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false); // stable ref for IntersectionObserver closure
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [restoreScrollY, setRestoreScrollY] = useState<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Scroll-based header animation
  const topGroupRef = useRef<HTMLDivElement>(null);
  const searchGroupRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const [scrollDir, setScrollDir] = useState<'top' | 'down' | 'up'>('top');
  const [topGroupH, setTopGroupH] = useState(88);
  const [searchGroupH, setSearchGroupH] = useState(96);

  // Click outside to close suggestions
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced Mapbox geocoding
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        const places = await searchPlaces(searchQuery);
        const results: LocationSuggestion[] = places.map((p, i) => ({
          id: String(i),
          name: p.name.split(",")[0],
          place_name: p.name,
          lat: p.lat,
          lng: p.lng,
        }));
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch { setSuggestions([]); }
      finally { setSuggestionsLoading(false); }
    }, 300);
  }, [searchQuery]);

  // Sync lastScrollY to actual scroll position on mount so scroll-restoration
  // doesn't trigger a false "scrolled down" detection on first scroll event.
  useLayoutEffect(() => {
    lastScrollY.current = window.scrollY;
  }, []);

  // Measure group heights (remeasure when context label appears/disappears)
  useLayoutEffect(() => {
    if (topGroupRef.current) setTopGroupH(topGroupRef.current.offsetHeight);
    if (searchGroupRef.current) setSearchGroupH(searchGroupRef.current.offsetHeight);
  }, [locationMode]);

  // Scroll listener — drives header animation (window scrolls, not the feed div)
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y <= 0) {
        setScrollDir('top');
      } else if (y > lastScrollY.current) {
        setScrollDir('down');
      } else {
        setScrollDir('up');
      }
      lastScrollY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const buildUrl = useCallback((currentOffset: number, coords: Coords | null, following: boolean, tag: string | null, query: string | null) => {
    let url = `/api/places/feed?limit=${LIMIT}&offset=${currentOffset}`;
    if (coords) url += `&lat=${coords.lat}&lng=${coords.lng}&radius=${RADIUS}`;
    if (query) url += `&q=${encodeURIComponent(query)}`;
    if (following) url += `&following=true`;
    if (tag) url += `&tag=${encodeURIComponent(tag)}`;
    return url;
  }, []);

  const fetchPosts = useCallback(async (opts: {
    loadMore?: boolean;
    coords?: Coords | null;
    currentOffset?: number;
    following?: boolean;
    tag?: string | null;
    query?: string | null;
  }) => {
    const { loadMore = false, coords = null, currentOffset, following = false, tag = null, query = null } = opts;
    const off = currentOffset ?? (loadMore ? offset : 0);
    if (loadMore) {
      loadingMoreRef.current = true;
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      const response = await apiGet<PlacesFeedResponse>(buildUrl(off, coords, following, tag, query));
      if (loadMore) {
        setPlaces(prev => [...prev, ...response.places]);
      } else {
        setPlaces(response.places);
      }
      setOffset(off + response.places.length);
      setHasMore(response.places.length === LIMIT);
    } catch (err) {
      setError((err as Error).message || "Failed to load feed");
    } finally {
      if (loadMore) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, [offset, buildUrl]);

  // On mount: restore from sessionStorage cache (navigating back from post) or do a fresh fetch
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(FEED_CACHE_KEY);
      if (raw) {
        const c = JSON.parse(raw);
        if (Array.isArray(c.places) && c.places.length > 0) {
          setPlaces(c.places);
          setOffset(c.offset ?? 0);
          setHasMore(c.hasMore ?? true);
          setActiveTab(c.activeTab ?? 'all');
          setLocationMode(c.locationMode ?? 'global');
          setUserCoords(c.userCoords ?? null);
          setSelectedCity(c.selectedCity ?? null);
          setActiveTag(c.activeTag ?? null);
          setActiveQuery(c.activeQuery ?? null);
          setRestoreScrollY(c.scrollY ?? 0);
          setLoading(false);
          return;
        }
      }
    } catch {}
    fetchPosts({ coords: null, currentOffset: 0, following: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save feed state + scroll position to sessionStorage so navigating back restores it
  useEffect(() => {
    const save = () => {
      try {
        sessionStorage.setItem(FEED_CACHE_KEY, JSON.stringify({
          places, offset, hasMore, scrollY: window.scrollY,
          activeTab, locationMode, userCoords, selectedCity, activeTag, activeQuery,
        }));
      } catch {}
    };
    window.addEventListener('scroll', save, { passive: true });
    return () => window.removeEventListener('scroll', save);
  }, [places, offset, hasMore, activeTab, locationMode, userCoords, selectedCity, activeTag, activeQuery]);

  // Restore scroll position after cached content paints
  useLayoutEffect(() => {
    if (restoreScrollY !== null && places.length > 0) {
      window.scrollTo(0, restoreScrollY);
      setRestoreScrollY(null);
    }
  }, [restoreScrollY, places.length]);

  // Infinite scroll — trigger load-more when sentinel enters viewport (600px early)
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMoreRef.current && !loading) {
          fetchPosts({ loadMore: true, coords: activeCoords, following: isFollowing, tag: activeTag, query: activeQuery });
        }
      },
      { rootMargin: '0px 0px 600px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loading, fetchPosts]);

  // When a background upload completes, refresh the feed so the new post appears
  useEffect(() => {
    if (uploadStatus !== "success") return;
    clearFeedCache();
    const coords = userCoords ?? (selectedCity ? { lat: selectedCity.lat, lng: selectedCity.lng } : null);
    fetchPosts({ coords, currentOffset: 0, following: activeTab === "following", tag: activeTag, query: activeQuery });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadStatus]);

  const handleSearch = () => {
    const q = searchQuery.trim();
    if (!q) return;
    clearFeedCache();
    setShowSuggestions(false);
    setSuggestions([]);
    setActiveQuery(q);
    setLocationMode("text");
    setUserCoords(null);
    setSelectedCity(null);
    setOffset(0);
    fetchPosts({ query: q, coords: null, currentOffset: 0, following: isFollowing, tag: activeTag });
  };

  const handleTabChange = (tab: Tab) => {
    clearFeedCache();
    setActiveTab(tab);
    setOffset(0);
    setLocationMode("global");
    setUserCoords(null);
    setSelectedCity(null);
    setActiveTag(null);
    setActiveQuery(null);
    setSearchQuery("");
    fetchPosts({ coords: null, currentOffset: 0, following: tab === "following", tag: null, query: null });
  };

  const isFollowing = activeTab === "following";

  const handleNearMe = () => {
    if (locationMode === "nearby") {
      clearFeedCache();
      setLocationMode("global");
      setUserCoords(null);
      setSelectedCity(null);
      setOffset(0);
      fetchPosts({ coords: null, currentOffset: 0, following: isFollowing, tag: activeTag });
      return;
    }
    setNearMeLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearFeedCache();
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        setSelectedCity(null);
        setSearchQuery("");
        setSuggestions([]);
        setActiveQuery(null);
        setLocationMode("nearby");
        setOffset(0);
        fetchPosts({ coords, currentOffset: 0, following: isFollowing, tag: activeTag, query: null });
        setNearMeLoading(false);
      },
      () => {
        setNearMeLoading(false);
        setError("Location access denied. Showing all posts.");
        setTimeout(() => setError(null), 3000);
      }
    );
  };

  const handleSelectCity = (s: LocationSuggestion) => {
    clearFeedCache();
    const city = { name: s.name, lat: s.lat, lng: s.lng };
    setSelectedCity(city);
    setUserCoords(null);
    setActiveQuery(null);
    setLocationMode("city");
    setSearchQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    setOffset(0);
    fetchPosts({ coords: city, currentOffset: 0, following: isFollowing, tag: activeTag, query: null });
  };

  const handleClearLocation = () => {
    clearFeedCache();
    setLocationMode("global");
    setUserCoords(null);
    setSelectedCity(null);
    setActiveQuery(null);
    setSearchQuery("");
    setOffset(0);
    fetchPosts({ coords: null, currentOffset: 0, following: isFollowing, tag: activeTag, query: null });
  };

  const handleTag = (t: string) => {
    clearFeedCache();
    setActiveTag(t);
    setShowTagFilter(false);
    const coords = locationMode === "nearby" ? userCoords : locationMode === "city" ? selectedCity : null;
    setOffset(0);
    fetchPosts({ coords, currentOffset: 0, following: isFollowing, tag: t, query: activeQuery });
  };

  const handleClearTag = () => {
    clearFeedCache();
    setActiveTag(null);
    const coords = locationMode === "nearby" ? userCoords : locationMode === "city" ? selectedCity : null;
    setOffset(0);
    fetchPosts({ coords, currentOffset: 0, following: isFollowing, tag: null, query: activeQuery });
  };

  const activeCoords = locationMode === "nearby" ? userCoords : locationMode === "city" ? selectedCity : null;

  const validPlaces = places.filter((p) => p.cover_post_id);
  const leftPlaces = validPlaces.filter((_, i) => i % 2 === 0);
  const rightPlaces = validPlaces.filter((_, i) => i % 2 === 1);

  const contextLabel =
    locationMode === "nearby" ? `📍 ${t('showingNearby', language)}` :
    locationMode === "city" ? `📍 ${t('showingAurasIn', language)} ${selectedCity?.name}` :
    locationMode === "text" ? `🔍 ${t('resultsFor', language)} "${activeQuery}"` :
    null;

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-[#F7F3EC]">

      {/* Spacer — preserves layout height for both fixed sections */}
      <div style={{ height: topGroupH + searchGroupH }} className="shrink-0" />

      {/* ── TopBar + Tabs — always fixed, never moves ── */}
      <div
        ref={topGroupRef}
        className={`fixed top-0 left-0 right-0 z-50 bg-[#F9F6F0] transition-shadow duration-300 ${scrollDir !== 'top' ? 'shadow-sm' : ''}`}
      >
        <TopBar />
        <div className="mt-2 flex items-center justify-center gap-2">
          {(["all", "following"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`rounded-full px-3 py-0.5 text-[15px] font-medium transition-colors capitalize ${
                activeTab === tab ? "bg-[#1A1613] text-[#EDE6D9]" : "text-[#1A1613]"
              }`}
            >
              {tab === "all" ? t("all", language) : t("following", language)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Search + Filters — hides on scroll down, returns on scroll up ── */}
      <div
        ref={searchGroupRef}
        className="fixed left-0 right-0 z-40 bg-[#F7F3EC] pb-2 transition-transform duration-300 ease-in-out"
        style={{ top: topGroupH, transform: `translateY(${scrollDir === 'down' ? -searchGroupH : 0}px)` }}
      >
          {/* Search + Near Me */}
          <div className="flex items-center gap-2 px-4 pt-3" ref={searchRef}>
            <div className="relative flex-1">
              <div className="flex items-center gap-2 rounded-xl bg-[#EDE6D9] px-3 py-2">
                <SearchIcon className="size-4 shrink-0 text-[#6B5F52]" />
                <input
                  type="text"
                  placeholder={t("searchLocationOrTitle", language)}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearch(); } }}
                  className="flex-1 bg-transparent text-[16px] text-[#1A1613] placeholder-[#6B5F52] outline-none"
                />
                {suggestionsLoading && <span className="text-[11px] text-[#6B5F52]">…</span>}
                {searchQuery && !suggestionsLoading && (
                  <button onClick={() => { setSearchQuery(""); setSuggestions([]); setShowSuggestions(false); }}>
                    <XIcon className="size-4 text-[#6B5F52]" />
                  </button>
                )}
              </div>

              {/* Suggestions dropdown */}
              {showSuggestions && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-[#D4C4A8] bg-[#F9F6F0] shadow-lg">
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      onMouseDown={(e) => { e.preventDefault(); handleSelectCity(s); }}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-[#EDE6D9]"
                    >
                      <PinIcon className="mt-0.5 size-4 shrink-0 text-[#B85C38]" />
                      <div className="min-w-0">
                        <p className="text-[14px] font-medium text-[#1A1613]">{s.name}</p>
                        <p className="truncate text-[12px] text-[#6B5F52]">{s.place_name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Near Me button */}
            <button
              onClick={handleNearMe}
              disabled={nearMeLoading}
              className={`flex size-[42px] shrink-0 items-center justify-center rounded-xl transition-colors ${
                locationMode === "nearby"
                  ? "bg-[#B85C38] text-white"
                  : "bg-[#EDE6D9] text-[#6B5F52]"
              }`}
            >
              {nearMeLoading
                ? <span className="text-[11px]">…</span>
                : <NearMeIcon className="size-5" />}
            </button>
          </div>

          {/* Context label */}
          {contextLabel && (
            <div className="mx-4 mt-2 flex items-center justify-between rounded-lg bg-[#EDE6D9] px-3 py-2">
              <span className="text-[13px] font-medium text-[#1A1613]">{contextLabel}</span>
              <button onClick={handleClearLocation}>
                <XIcon className="size-4 text-[#6B5F52]" />
              </button>
            </div>
          )}

          {/* Tag filter / Advanced Search */}
          <div className="mt-2 flex gap-2 px-4 pb-1">
            <button
              onClick={() => setShowTagFilter(true)}
              className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium transition-colors ${
                activeTag ? "bg-[#B85C38] text-white" : "bg-[#EDE6D9] text-[#6B5F52]"
              }`}
            >
              <SlidersIcon className="size-3.5" />
              {activeTag ? `#${translateTag(activeTag, language)}` : t("advancedSearch", language)}
              {activeTag && (
                <span
                  onClick={(e) => { e.stopPropagation(); handleClearTag(); }}
                  className="ml-0.5 flex size-4 items-center justify-center rounded-full bg-white/20 text-white"
                >
                  <XIcon className="size-2.5" />
                </span>
              )}
            </button>
          </div>
      </div>

      {/* Feed */}
      <div className="mt-3 flex-1 px-[7px] pb-20">
        {loading && (
          <div className="flex items-center justify-center py-4">
            <p className="text-[13px] text-[#6B5F52]">{t("loading", language)}</p>
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center py-8">
            <p className="text-[14px] text-red-500">{error}</p>
          </div>
        )}
        {!error && places.length > 0 && (
          <>
            <div className="flex gap-2">
              <div className="flex flex-1 flex-col gap-4">
                {leftPlaces.map((place) => <FeedCard key={place.id} place={place} />)}
              </div>
              <div className="flex flex-1 flex-col gap-4">
                {rightPlaces.map((place) => <FeedCard key={place.id} place={place} />)}
              </div>
            </div>
            {/* Sentinel — IntersectionObserver fires 600px before this enters view */}
            <div ref={sentinelRef} className="h-1" />
            {loadingMore && (
              <div className="flex justify-center py-4">
                <div className="size-5 animate-spin rounded-full border-2 border-[#D4C4A8] border-t-[#B85C38]" />
              </div>
            )}
          </>
        )}
        {!loading && !error && places.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
            {locationMode !== "global" ? (
              <>
                <p className="text-[32px]">🗺️</p>
                <p className="mt-3 text-[17px] font-semibold text-[#1A1613]">
                  {t("noAurasYet", language)}
                </p>
                <p className="mt-1 text-[14px] text-[#6B5F52]">{t("beFirstCapture", language)}</p>
                <Link href="/upload" className="mt-5 rounded-xl bg-[#B85C38] px-6 py-3 text-[15px] font-semibold text-white">
                  {t("bePioneer", language)}
                </Link>
              </>
            ) : (
              <p className="text-[15px] text-[#6B5F52]">No posts yet</p>
            )}
          </div>
        )}
      </div>

      {/* Tag filter bottom sheet */}
      {showTagFilter && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowTagFilter(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full rounded-t-2xl bg-[#F9F6F0] pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-[#D4C4A8]" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <p className="text-[17px] font-bold text-[#1A1613]">{t("filterByTag", language)}</p>
              <button onClick={() => setShowTagFilter(false)} className="flex size-8 items-center justify-center rounded-full bg-[#EDE6D9]">
                <XIcon className="size-4 text-[#6B5F52]" />
              </button>
            </div>

            {/* Tags — grouped, scrollable */}
            <div className="max-h-[60vh] overflow-y-auto px-5 pb-2 space-y-4">
              {TAG_GROUPS.map((group) => (
                <div key={group.key}>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#A09080]">
                    {translateGroupLabel(group, language)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => handleTag(tag)}
                        className={`flex items-center gap-1 rounded-[6px] px-3 py-1.5 text-[13px] font-medium transition-colors ${
                          activeTag === tag
                            ? "bg-[#B85C38] text-white"
                            : "border border-[#D4C4A8] text-[#6B5F52]"
                        }`}
                      >
                        <svg className="size-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                          <line x1="7" y1="7" x2="7.01" y2="7" />
                        </svg>
                        {translateTag(tag, language)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
