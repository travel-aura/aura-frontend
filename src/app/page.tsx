"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { searchPlaces } from "@/lib/geocoding";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import type { Aura } from "../../shared/aura-schema";

const RADIUS = 5000;
const LIMIT = 10;

const ALL_TAGS = [
  "Downtown", "Neighborhoods", "Alleyways", "Courtyards",
  "LocalMarkets", "NightMarkets", "StreetArt", "Bridges",
  "Waterfront", "Rooftops & Skylines", "Architecture",
  "Mountains", "Forests", "Deserts", "Waterfalls", "Lakes", "Caves",
  "Beaches", "Islands", "Canyons", "Parks & Gardens", "Countryside",
  "Cafes", "Speakeasies", "Bookshops", "Libraries", "Boutiques",
  "Museums", "Galleries", "Hotels & Stays", "HistoricSites", "PopCulture",
  "StreetFood", "FineDining", "LiveMusic", "JazzBars", "LocalEats",
  "Hiking", "Cycling", "RoadTrip", "Camping", "WaterSports",
  "GoldenHour", "BlueHour", "Sunrise", "Sunset", "Stargazing",
  "Cinematic", "Cozy", "Vibrant", "Quiet", "Bustling", "Vintage",
  "Romantic", "Moody",
];

function formatDistance(m: number) {
  return m < 1000 ? `${Math.round(m)}m away` : `${(m / 1000).toFixed(1)}km away`;
}

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

function FeedCard({ post }: { post: Aura }) {
  return (
    <Link href={`/post/${post.id}`} className="block">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-[#d9d9d9]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={post.image_urls[0]} alt={post.title} loading="lazy" className="h-full w-full object-cover" />

        {/* Multi-image indicator */}
        {post.image_urls.length > 1 && (
          <div className="absolute left-2 top-2">
            <LayersIcon className="size-5 text-white drop-shadow-lg" />
          </div>
        )}

        {/* Gradient scrim + title */}
        <div className="absolute inset-x-0 bottom-0 rounded-b-lg bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-2.5 pt-8">
          <p className="line-clamp-2 text-[13px] font-semibold leading-tight text-white drop-shadow">
            {post.title}
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

  // Tag filter
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [showTagFilter, setShowTagFilter] = useState(false);

  // Feed state
  const [posts, setPosts] = useState<Aura[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

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
    let url = `/api/auras/feed?limit=${LIMIT}&offset=${currentOffset}`;
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
    try {
      setLoading(true);
      const response = await apiGet<{
        ok: boolean;
        auras: Aura[];
        pagination: { limit: number; offset: number; count: number };
      }>(buildUrl(off, coords, following, tag, query));

      if (loadMore) {
        setPosts(prev => [...prev, ...response.auras]);
      } else {
        setPosts(response.auras);
      }
      setOffset(off + response.auras.length);
      setHasMore(response.auras.length === LIMIT);
    } catch (err) {
      setError((err as Error).message || "Failed to load feed");
    } finally {
      setLoading(false);
    }
  }, [offset, buildUrl]);

  useEffect(() => {
    fetchPosts({ coords: null, currentOffset: 0, following: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    const q = searchQuery.trim();
    if (!q) return;
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
    setLocationMode("global");
    setUserCoords(null);
    setSelectedCity(null);
    setActiveQuery(null);
    setSearchQuery("");
    setOffset(0);
    fetchPosts({ coords: null, currentOffset: 0, following: isFollowing, tag: activeTag, query: null });
  };

  const handleTag = (t: string) => {
    setActiveTag(t);
    setShowTagFilter(false);
    const coords = locationMode === "nearby" ? userCoords : locationMode === "city" ? selectedCity : null;
    setOffset(0);
    fetchPosts({ coords, currentOffset: 0, following: isFollowing, tag: t, query: activeQuery });
  };

  const handleClearTag = () => {
    setActiveTag(null);
    const coords = locationMode === "nearby" ? userCoords : locationMode === "city" ? selectedCity : null;
    setOffset(0);
    fetchPosts({ coords, currentOffset: 0, following: isFollowing, tag: null, query: activeQuery });
  };

  const activeCoords = locationMode === "nearby" ? userCoords : locationMode === "city" ? selectedCity : null;

  const leftPosts = posts.filter((_, i) => i % 2 === 0);
  const rightPosts = posts.filter((_, i) => i % 2 === 1);

  const contextLabel =
    locationMode === "nearby" ? "📍 Showing nearby posts" :
    locationMode === "city" ? `📍 Showing Auras in ${selectedCity?.name}` :
    locationMode === "text" ? `🔍 Results for "${activeQuery}"` :
    null;

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-white">

      {/* Spacer — preserves layout height for both fixed sections */}
      <div style={{ height: topGroupH + searchGroupH }} className="shrink-0" />

      {/* ── TopBar + Tabs — always fixed, never moves ── */}
      <div
        ref={topGroupRef}
        className={`fixed top-0 left-0 right-0 z-50 bg-white transition-shadow duration-300 ${scrollDir !== 'top' ? 'shadow-sm' : ''}`}
      >
        <TopBar />
        <div className="mt-2 flex items-center justify-center gap-2">
          {(["all", "following"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => handleTabChange(t)}
              className={`rounded-full px-3 py-0.5 text-[15px] font-medium transition-colors capitalize ${
                activeTab === t ? "bg-[#5a5a5a] text-[#f5f5f5]" : "text-[#1e1e1e]"
              }`}
            >
              {t === "all" ? "All" : "Following"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Search + Filters — hides on scroll down, returns on scroll up ── */}
      <div
        ref={searchGroupRef}
        className="fixed left-0 right-0 z-40 bg-white pb-2 transition-transform duration-300 ease-in-out"
        style={{ top: topGroupH, transform: `translateY(${scrollDir === 'down' ? -searchGroupH : 0}px)` }}
      >
          {/* Search + Near Me */}
          <div className="flex items-center gap-2 px-4 pt-3" ref={searchRef}>
            <div className="relative flex-1">
              <div className="flex items-center gap-2 rounded-xl bg-[#f3f3f3] px-3 py-2">
                <SearchIcon className="size-4 shrink-0 text-[#757575]" />
                <input
                  type="text"
                  placeholder="Search location or post title…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearch(); } }}
                  className="flex-1 bg-transparent text-[16px] text-[#1e1e1e] placeholder-[#757575] outline-none"
                />
                {suggestionsLoading && <span className="text-[11px] text-[#757575]">…</span>}
                {searchQuery && !suggestionsLoading && (
                  <button onClick={() => { setSearchQuery(""); setSuggestions([]); setShowSuggestions(false); }}>
                    <XIcon className="size-4 text-[#757575]" />
                  </button>
                )}
              </div>

              {/* Suggestions dropdown */}
              {showSuggestions && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-[#e8e8e8] bg-white shadow-lg">
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      onMouseDown={(e) => { e.preventDefault(); handleSelectCity(s); }}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-[#f9f9f9]"
                    >
                      <PinIcon className="mt-0.5 size-4 shrink-0 text-[#fa6460]" />
                      <div className="min-w-0">
                        <p className="text-[14px] font-medium text-[#1e1e1e]">{s.name}</p>
                        <p className="truncate text-[12px] text-[#757575]">{s.place_name}</p>
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
                  ? "bg-[#fa6460] text-white"
                  : "bg-[#f3f3f3] text-[#757575]"
              }`}
            >
              {nearMeLoading
                ? <span className="text-[11px]">…</span>
                : <NearMeIcon className="size-5" />}
            </button>
          </div>

          {/* Context label */}
          {contextLabel && (
            <div className="mx-4 mt-2 flex items-center justify-between rounded-lg bg-[#fff3f3] px-3 py-2">
              <span className="text-[13px] font-medium text-[#1e1e1e]">{contextLabel}</span>
              <button onClick={handleClearLocation}>
                <XIcon className="size-4 text-[#757575]" />
              </button>
            </div>
          )}

          {/* Tag filter / Advanced Search */}
          <div className="mt-2 flex gap-2 px-4 pb-1">
            <button
              onClick={() => setShowTagFilter(true)}
              className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium transition-colors ${
                activeTag ? "bg-[#fff1c2] text-[#595959]" : "bg-[#f3f3f3] text-[#757575]"
              }`}
            >
              <SlidersIcon className="size-3.5" />
              {activeTag ? `#${activeTag}` : "Advanced Search"}
              {activeTag && (
                <span
                  onClick={(e) => { e.stopPropagation(); handleClearTag(); }}
                  className="ml-0.5 flex size-4 items-center justify-center rounded-full bg-[#d4a800]/20 text-[#595959]"
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
            <p className="text-[13px] text-[#757575]">Loading…</p>
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center py-8">
            <p className="text-[14px] text-red-500">{error}</p>
          </div>
        )}
        {!error && posts.length > 0 && (
          <>
            <div className="flex gap-2">
              <div className="flex flex-1 flex-col gap-4">
                {leftPosts.map((post) => <FeedCard key={post.id} post={post} />)}
              </div>
              <div className="flex flex-1 flex-col gap-4">
                {rightPosts.map((post) => <FeedCard key={post.id} post={post} />)}
              </div>
            </div>
            {hasMore && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => fetchPosts({ loadMore: true, coords: activeCoords, following: isFollowing, tag: activeTag, query: activeQuery })}
                  disabled={loading}
                  className="rounded-lg bg-[#ededed] px-6 py-2.5 text-[14px] font-medium text-[#1e1e1e] disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </>
        )}
        {!loading && !error && posts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
            {locationMode !== "global" ? (
              <>
                <p className="text-[32px]">🗺️</p>
                <p className="mt-3 text-[17px] font-semibold text-[#1e1e1e]">
                  No Auras here yet.
                </p>
                <p className="mt-1 text-[14px] text-[#757575]">Be the first to capture this place.</p>
                <Link href="/upload" className="mt-5 rounded-xl bg-[#fa6460] px-6 py-3 text-[15px] font-semibold text-white">
                  Be a Pioneer 🚩
                </Link>
              </>
            ) : (
              <p className="text-[15px] text-[#757575]">No posts yet</p>
            )}
          </div>
        )}
      </div>

      {/* Tag filter bottom sheet */}
      {showTagFilter && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowTagFilter(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full rounded-t-2xl bg-white pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-[#d9d9d9]" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <p className="text-[17px] font-bold text-[#1e1e1e]">Filter by Tag</p>
              <button onClick={() => setShowTagFilter(false)} className="flex size-8 items-center justify-center rounded-full bg-[#f3f3f3]">
                <XIcon className="size-4 text-[#757575]" />
              </button>
            </div>

            {/* Tags — scrollable */}
            <div className="max-h-[60vh] overflow-y-auto px-5 pb-2">
              <div className="flex flex-wrap gap-2">
                {ALL_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleTag(tag)}
                    className={`flex items-center gap-1 rounded-[6px] px-3 py-1.5 text-[13px] font-medium transition-colors ${
                      activeTag === tag
                        ? "bg-[#fff1c2] text-[#595959]"
                        : "border border-[#e8e8e8] text-[#757575]"
                    }`}
                  >
                    <svg className="size-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                      <line x1="7" y1="7" x2="7.01" y2="7" />
                    </svg>
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
