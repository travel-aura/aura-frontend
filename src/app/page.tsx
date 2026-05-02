"use client";

import { type ComponentType, useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import type { Post } from "../../shared/aura-schema";

function getMapboxToken(): string {
  if (typeof window !== "undefined" && (window as { __MAPBOX_TOKEN__?: string }).__MAPBOX_TOKEN__) {
    return (window as { __MAPBOX_TOKEN__?: string }).__MAPBOX_TOKEN__!;
  }
  return process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
}
const RADIUS = 5000;

// ── Icons ─────────────────────────────────────────────────────────────────────

function LayersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L2 7l10 5 10-5-10-5z" opacity="0.6"/>
      <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
    </svg>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M10.707 2.293a1 1 0 0 1 1.414 0l8 8A1 1 0 0 1 20 12h-1v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9H3a1 1 0 0 1-.707-1.707l8-8Z" />
    </svg>
  );
}

function PlusSquareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
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

interface SelectedLocation {
  name: string;
  lat: number;
  lng: number;
}

// ── Feed Card ─────────────────────────────────────────────────────────────────

function FeedCard({ post }: { post: Post }) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Link href={`/post/${post.id}`} className="flex flex-col gap-1">
      <div className="relative h-[232px] w-full overflow-hidden rounded-lg bg-[#d9d9d9]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={post.image_urls[0]} alt={post.title} className="h-full w-full object-cover" />
        {post.image_urls.length > 1 && (
          <div className="absolute left-2 top-2">
            <LayersIcon className="size-5 text-white drop-shadow-lg" />
          </div>
        )}
        <span className="absolute bottom-[10px] right-2 rounded-full bg-[#2c2c2c] px-2 py-0.5 text-[9px] font-medium text-[#f3f3f3] shadow-[0px_0px_4px_0px_rgba(0,0,0,0.12)]">
          {post.archetype_tag}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 pt-0.5">
        <div className="flex items-center gap-1 overflow-hidden">
          {post.is_verified && <span className="shrink-0 text-[11px]">📍</span>}
          <span className="truncate text-[13px] font-semibold leading-tight text-[#1e1e1e]">{post.title}</span>
        </div>
        {post.description && (
          <p className="truncate text-[13px] leading-tight text-[#757575]">{post.description}</p>
        )}
        <p className="text-[11px] text-[#999]">{formatDate(post.created_at)}</p>
      </div>
    </Link>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = "all" | "following";
type NavItem = "home" | "create" | "profile";

export default function AuraFeed() {
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [activeNav, setActiveNav] = useState<NavItem>("home");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  // Location search state
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const LIMIT = 10;

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
      const token = getMapboxToken();
      if (!token) return;
      setSuggestionsLoading(true);
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${token}&types=place,locality,neighborhood,district&limit=5`;
        const res = await fetch(url);
        const data = await res.json();
        const results: LocationSuggestion[] = (data.features ?? []).map((f: {
          id: string;
          text: string;
          place_name: string;
          center: [number, number];
        }) => ({
          id: f.id,
          name: f.text,
          place_name: f.place_name,
          lat: f.center[1],
          lng: f.center[0],
        }));
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 300);
  }, [searchQuery]);

  const fetchPosts = useCallback(async (loadMore = false, location: SelectedLocation | null = null) => {
    try {
      setLoading(true);
      const currentOffset = loadMore ? offset : 0;

      let url = `/api/auras/feed?limit=${LIMIT}&offset=${currentOffset}`;
      if (location) {
        url += `&lat=${location.lat}&lng=${location.lng}&radius=${RADIUS}`;
      }

      const response = await apiGet<{
        ok: boolean;
        auras: Post[];
        pagination: { limit: number; offset: number; count: number };
      }>(url);

      if (loadMore) {
        setPosts(prev => [...prev, ...response.auras]);
      } else {
        setPosts(response.auras);
      }

      setOffset(currentOffset + response.auras.length);
      setHasMore(response.auras.length === LIMIT);
    } catch (err) {
      setError((err as Error).message || "Failed to load feed");
    } finally {
      setLoading(false);
    }
  }, [offset]);

  useEffect(() => {
    fetchPosts(false, null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectLocation = (suggestion: LocationSuggestion) => {
    const location: SelectedLocation = {
      name: suggestion.name,
      lat: suggestion.lat,
      lng: suggestion.lng,
    };
    setSelectedLocation(location);
    setSearchQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    setOffset(0);
    fetchPosts(false, location);
  };

  const handleClearLocation = () => {
    setSelectedLocation(null);
    setSearchQuery("");
    setOffset(0);
    fetchPosts(false, null);
  };

  const leftPosts = posts.filter((_, i) => i % 2 === 0);
  const rightPosts = posts.filter((_, i) => i % 2 === 1);

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-white">
      {/* Header */}
      <div className="flex justify-center pt-2">
        <span className="text-[20px] font-bold tracking-tight text-[#1e1e1e]">Aura</span>
      </div>

      {/* Filter tabs */}
      <div className="mt-2 flex items-center justify-center gap-2">
        <button
          onClick={() => setActiveTab("all")}
          className={`rounded-full px-3 py-0.5 text-[15px] font-medium transition-colors ${
            activeTab === "all" ? "bg-[#5a5a5a] text-[#f5f5f5]" : "text-[#1e1e1e]"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setActiveTab("following")}
          className={`rounded-full px-3 py-0.5 text-[15px] transition-colors ${
            activeTab === "following" ? "bg-[#5a5a5a] text-[#f5f5f5]" : "text-[#1e1e1e]"
          }`}
        >
          Following
        </button>
      </div>

      {/* Search bar */}
      <div className="relative px-4 pt-3" ref={searchRef}>
        <div className="flex items-center gap-2 rounded-xl bg-[#f3f3f3] px-3 py-2">
          <SearchIcon className="size-4 shrink-0 text-[#757575]" />
          <input
            type="text"
            placeholder="Search a location…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            className="flex-1 bg-transparent text-[14px] text-[#1e1e1e] placeholder-[#757575] outline-none"
          />
          {suggestionsLoading && (
            <span className="text-[11px] text-[#757575]">…</span>
          )}
          {searchQuery && !suggestionsLoading && (
            <button onClick={() => { setSearchQuery(""); setSuggestions([]); setShowSuggestions(false); }}>
              <XIcon className="size-4 text-[#757575]" />
            </button>
          )}
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && (
          <div className="absolute left-4 right-4 top-full z-50 mt-1 overflow-hidden rounded-xl border border-[#e8e8e8] bg-white shadow-lg">
            {suggestions.map((s) => (
              <button
                key={s.id}
                onMouseDown={(e) => { e.preventDefault(); handleSelectLocation(s); }}
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-[#f9f9f9] active:bg-[#f3f3f3]"
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

      {/* Active location breadcrumb */}
      {selectedLocation && (
        <div className="mx-4 mt-2 flex items-center justify-between rounded-lg bg-[#fff3f3] px-3 py-2">
          <div className="flex items-center gap-1.5">
            <PinIcon className="size-4 shrink-0 text-[#fa6460]" />
            <span className="text-[13px] font-medium text-[#1e1e1e]">
              Showing Auras in <span className="text-[#fa6460]">{selectedLocation.name}</span>
            </span>
          </div>
          <button onClick={handleClearLocation} className="ml-2 shrink-0">
            <XIcon className="size-4 text-[#757575]" />
          </button>
        </div>
      )}

      {/* Feed */}
      <div className="mt-4 flex-1 overflow-y-auto px-[7px] pb-20">
        {loading && posts.length === 0 && (
          <div className="flex items-center justify-center py-24">
            <p className="text-[15px] text-[#757575]">Loading feed...</p>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-24">
            <p className="text-[15px] text-red-500">{error}</p>
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
                  onClick={() => fetchPosts(true, selectedLocation)}
                  disabled={loading}
                  className="rounded-lg bg-[#ededed] px-6 py-2.5 text-[14px] font-medium text-[#1e1e1e] transition-opacity hover:bg-[#e0e0e0] disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {!loading && !error && posts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
            {selectedLocation ? (
              <>
                <p className="text-[32px]">🗺️</p>
                <p className="mt-3 text-[17px] font-semibold text-[#1e1e1e]">
                  No Auras in {selectedLocation.name} yet.
                </p>
                <p className="mt-1 text-[14px] text-[#757575]">Be the first to capture this place.</p>
                <Link
                  href="/upload"
                  className="mt-5 rounded-xl bg-[#fa6460] px-6 py-3 text-[15px] font-semibold text-white"
                >
                  Be a Pioneer 🚩
                </Link>
              </>
            ) : (
              <p className="text-[15px] text-[#757575]">No posts yet</p>
            )}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 flex h-16 items-center justify-center border-t border-[#d9d9d9] bg-white shadow-[0px_-2px_4px_0px_rgba(0,0,0,0.12)]">
        <div className="flex w-[291px] items-center justify-between">
          {(
            [
              { id: "home", label: "Home", href: "/", Icon: HomeIcon },
              { id: "create", label: "Create", href: "/upload", Icon: PlusSquareIcon },
              { id: "profile", label: "Profile", href: "/profile", Icon: UserIcon },
            ] as { id: NavItem; label: string; href: string; Icon: ComponentType<{ className?: string }> }[]
          ).map(({ id, label, href, Icon }) => (
            <Link
              key={id}
              href={href}
              onClick={() => setActiveNav(id)}
              className="flex w-[37px] flex-col items-center"
            >
              <Icon className={`size-6 ${activeNav === id ? "text-[#fa6460]" : "text-[#2c2c2c]"}`} />
              <span className={`text-[11px] leading-[1.5] ${activeNav === id ? "text-[#fa6460]" : "text-[#2c2c2c]"}`}>
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
