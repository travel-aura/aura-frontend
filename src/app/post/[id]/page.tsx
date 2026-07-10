"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet, API_BASE } from "@/lib/api";
import { getToken, getUserId } from "@/lib/auth";
import { getCityFromCoordinates } from "@/lib/geocoding";
import { useLanguage } from "@/hooks/useLanguage";
import { translateTag } from "@/lib/i18n";
import type { AuraWithUser, Aura, Place, PlaceResponse } from "../../../../shared/aura-schema";

const DEFAULT_AVATAR = "https://www.figma.com/api/mcp/asset/e4add399-8205-4c2a-8782-3da6c9f7bf60";

// ── Icons ─────────────────────────────────────────────────────────────────────

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function BookmarkIcon({ className, filled }: { className?: string; filled?: boolean }) {
  if (filled) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

function StoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
      <path d="M3 9l2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9" />
      <line x1="12" y1="3" x2="12" y2="9" />
    </svg>
  );
}

function CameraAddIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <line x1="12" y1="11" x2="12" y2="17" />
      <line x1="9" y1="14" x2="15" y2="14" />
    </svg>
  );
}

// ── Post Detail Page ───────────────────────────────────────────────────────────

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;

  const { language } = useLanguage();
  const [post, setPost] = useState<AuraWithUser | null>(null);
  const [cityLocation, setCityLocation] = useState<string | null>(null);
  const [mapToken, setMapToken] = useState<string>("");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distanceM: number; durationS: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [authToast, setAuthToast] = useState<string | null>(null);
  const [authRedirect, setAuthRedirect] = useState<string>("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [place, setPlace] = useState<Place | null>(null);
  const [placePosts, setPlacePosts] = useState<Aura[]>([]);
  const [navVisible, setNavVisible] = useState(false);
  const lastScrollTop = useRef(0);

  // ── Main data fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);

        let foundPost: AuraWithUser | undefined;
        try {
          const directResponse = await apiGet<{ ok: boolean; aura: AuraWithUser }>(`/api/auras/${postId}`);
          foundPost = directResponse.aura;
        } catch {
          const feedResponse = await apiGet<{ ok: boolean; auras: AuraWithUser[] }>("/api/auras/feed?limit=100&offset=0");
          foundPost = feedResponse.auras.find((p) => p.id === postId);
        }

        if (!foundPost) { setError("Post not found"); return; }

        // Show post immediately — don't wait for secondary data
        setPost(foundPost);
        setIsSaved(foundPost.is_saved);
        setLoading(false);

        // Secondary requests fire in background — page is already visible
        const token = getToken();
        const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

        const [cityTokenResult, userProfileResult, placeResult] = await Promise.allSettled([
          // 0: reverse geocode + mapbox token
          foundPost.lat && foundPost.lng
            ? Promise.all([
                getCityFromCoordinates(foundPost.lat, foundPost.lng),
                fetch("/api/mapbox-token").then((r) => r.json()),
              ])
            : Promise.resolve(null),
          // 1: user display name (only if not embedded)
          !foundPost.user?.name && !foundPost.user_name && foundPost.user_id
            ? fetch(`${API_BASE}/api/users/${foundPost.user_id}`, { headers: authHeader })
                .then((r) => r.ok ? r.json() : null)
            : Promise.resolve(null),
          // 2: place data — graceful 404 if backend not yet ready
          foundPost.place_id
            ? fetch(`${API_BASE}/api/places/${foundPost.place_id}`, { headers: authHeader })
                .then((r) => r.ok ? r.json() : null)
            : Promise.resolve(null),
        ]);

        if (cityTokenResult.status === "fulfilled" && cityTokenResult.value) {
          const [city, tokenData] = cityTokenResult.value as [string, { token: string }];
          setCityLocation(city);
          setMapToken(tokenData.token ?? "");
        }
        if (userProfileResult.status === "fulfilled" && userProfileResult.value) {
          const pd = userProfileResult.value as { profile?: { name?: string; avatar_url?: string | null } };
          const name = pd.profile?.name;
          const avatar = pd.profile?.avatar_url ?? null;
          if (name) setPost((prev) => prev ? { ...prev, user: { id: prev.user_id, name, email: "", avatar_url: avatar } } : prev);
        }
        if (placeResult.status === "fulfilled" && placeResult.value) {
          const pd = placeResult.value as PlaceResponse;
          if (pd.place) {
            setPlace(pd.place);
            setPlacePosts((pd.posts ?? []).filter((p) => p.id !== foundPost!.id));
          }
        }
      } catch (err) {
        setError((err as Error).message || "Failed to load post");
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  // ── User geolocation ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, []);

  // ── Directions (walking route) ───────────────────────────────────────────────
  useEffect(() => {
    if (!userCoords || !post?.lat || !post?.lng || !mapToken) return;
    const coords = `${userCoords.lng},${userCoords.lat};${post.lng},${post.lat}`;
    fetch(`https://api.mapbox.com/directions/v5/mapbox/walking/${coords}?access_token=${mapToken}&overview=false`)
      .then((r) => r.json())
      .then((data) => {
        const route = data.routes?.[0];
        if (route) setRouteInfo({ distanceM: route.distance, durationS: route.duration });
      })
      .catch(() => {});
  }, [userCoords?.lat, userCoords?.lng, post?.id, mapToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const requireAuth = (msg: string, redirect?: string): boolean => {
    if (getToken()) return true;
    setAuthToast(msg);
    setAuthRedirect(redirect ?? "");
    setTimeout(() => setAuthToast(null), 2500);
    return false;
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${postId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); document.body.removeChild(ta);
    }
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const handleSave = async () => {
    if (savePending || !post) return;
    setSavePending(true);
    const token = getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    try {
      if (isSaved) {
        await fetch(`${API_BASE}/api/saves/${post.id}`, { method: "DELETE", headers });
        setIsSaved(false);
      } else {
        await fetch(`${API_BASE}/api/saves`, { method: "POST", headers, body: JSON.stringify({ aura_id: post.id }) });
        setIsSaved(true);
      }
    } catch { /* keep state */ }
    finally { setSavePending(false); }
  };

  const handleDelete = async () => {
    if (deleteLoading || !post) return;
    setDeleteLoading(true);
    const token = getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    try {
      const res = await fetch(`${API_BASE}/api/auras/${post.id}`, { method: "DELETE", headers });
      if (!res.ok) throw new Error("Failed to delete post");
      router.push("/profile");
    } catch {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  // ── Render guards ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F3EC]">
        <p className="text-[15px] text-[#6B5F52]">Loading...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F7F3EC] px-4">
        <p className="text-[15px] font-semibold text-red-600">{error || "Post not found"}</p>
        <button onClick={() => router.back()} className="mt-4 rounded-lg bg-[#EDE6D9] px-4 py-2 text-[14px] font-medium text-[#1A1613]">
          Go Back
        </button>
      </div>
    );
  }

  const isOwnPost = post.user_id === getUserId();
  // Place name takes priority over reverse-geocoded city
  const displayLocation = place?.name ?? post.place_name ?? cityLocation;

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-[#F7F3EC]">

      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left: back + user */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const fromSameApp = document.referrer && new URL(document.referrer).origin === window.location.origin;
              fromSameApp ? router.back() : router.push("/");
            }}
            className="flex items-center justify-center"
          >
            <ChevronLeftIcon className="size-6 text-[#1A1613]" />
          </button>

          <Link
            href={isOwnPost ? "/profile" : `/profile/${post.user_id}`}
            className="flex items-center gap-2"
          >
            <div className="size-8 overflow-hidden rounded-full bg-[#EDE6D9]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.user?.avatar_url || post.user_avatar_url || DEFAULT_AVATAR}
                alt={post.user?.name || post.user_name || "User"}
                className="h-full w-full object-cover"
              />
            </div>
            <span className="text-[15px] font-semibold text-[#1A1613]">
              {post.user?.name || post.user_name || post.user?.email?.split("@")[0]}
            </span>
          </Link>
        </div>

        {/* Right: save (or delete for own post) + share */}
        <div className="flex items-center gap-3.5">
          {isOwnPost ? (
            <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center justify-center">
              <TrashIcon className="size-5 text-[#6B5F52]" />
            </button>
          ) : (
            <button
              onClick={() => { if (requireAuth("Sign up to save posts")) handleSave(); }}
              disabled={savePending}
              className="flex items-center justify-center disabled:opacity-50"
            >
              <BookmarkIcon
                className={`size-5 ${isSaved ? "text-[#B85C38]" : "text-[#1A1613]"}`}
                filled={isSaved}
              />
            </button>
          )}

          <button onClick={handleShare} className="flex items-center justify-center">
            {shareCopied
              ? <span className="text-[12px] font-semibold text-[#B85C38]">Copied!</span>
              : <ShareIcon className="size-5 text-[#1A1613]" />
            }
          </button>
        </div>
      </div>

      {/* ── Scrollable body ─────────────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto pb-safe"
        onScroll={(e) => {
          const el = e.currentTarget;
          const y = el.scrollTop;
          const atBottom = y + el.clientHeight >= el.scrollHeight - 20;
          setNavVisible(!atBottom && y < lastScrollTop.current && y > 40);
          lastScrollTop.current = y;
        }}
      >

        {/* ── Photo carousel ────────────────────────────────────────────────────── */}
        <div className="relative pl-4">
          <div
            className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide"
            onScroll={(e) => {
              const el = e.currentTarget;
              const itemWidth = el.scrollWidth / post.image_urls.length;
              setActiveImageIndex(Math.round(el.scrollLeft / itemWidth));
            }}
          >
            {post.image_urls.map((url, index) => (
              <div
                key={index}
                className="aspect-[3/4] w-[62%] shrink-0 snap-start overflow-hidden rounded-2xl cursor-zoom-in"
                onClick={() => setLightboxIndex(index)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`${post.title} ${index + 1}`} className="h-full w-full object-cover" />
              </div>
            ))}
            <div className="w-4 shrink-0" />
          </div>

          {post.image_urls.length > 1 && (
            <div className="mt-3 flex justify-center gap-1.5">
              {post.image_urls.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 rounded-full transition-all ${index === activeImageIndex ? "w-6 bg-[#1A1613]" : "w-1.5 bg-[#D4C4A8]"}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Main content ──────────────────────────────────────────────────────── */}
        <div className="px-4 pt-4 pb-2">

          {/* Title */}
          <h1 className="text-[22px] font-bold leading-tight text-[#1A1613]">{post.title}</h1>

          {/* Description */}
          {post.description && (
            <p className="mt-2 text-[15px] leading-relaxed text-[#6B5F52]">{post.description}</p>
          )}

          {/* Tags row */}
          {(post.is_verified || (post.tags?.length ?? 0) > 0) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {post.is_verified && (
                <span className="inline-flex items-center rounded-full bg-[#DEC9A0] px-2.5 py-1 text-[13px]">
                  📍
                </span>
              )}
              {(post.tags ?? []).map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 rounded-[6px] bg-[#EDE6D9] px-3 py-1 text-[12px] font-medium text-[#6B5F52]">
                  <svg className="size-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                    <line x1="7" y1="7" x2="7.01" y2="7" />
                  </svg>
                  {translateTag(tag, language)}
                </span>
              ))}
            </div>
          )}

          {/* ── Info card ────────────────────────────────────────────────────────── */}
          {(place || (post.lat && post.lng)) && (() => {
            const hasGPS = !!(post.lat && post.lng);
            // Count starts at 1 if this post itself is verified, ensuring it's never zero for verified posts
            const verifiedCount = Math.max(place?.verified_count ?? 0, post.is_verified ? 1 : 0);
            const showBeFirst = verifiedCount === 0;

            return (
              <div className="mt-4 rounded-2xl bg-[#EDE6D9] px-4 py-4">

                {/* Unverified notice */}
                {!post.is_verified && (
                  <div className="mb-3 flex items-center gap-2 rounded-xl bg-[#F7F3EC] px-3 py-2">
                    <svg className="size-3.5 shrink-0 text-[#A09080]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <p className="text-[12px] text-[#6B5F52]">
                      Not verified · Approximate location only
                    </p>
                  </div>
                )}

                {/* Place name + city */}
                {displayLocation && (
                  <div className="mb-3">
                    <p className="text-[17px] font-bold leading-snug text-[#1A1613]">
                      {displayLocation}
                    </p>
                    {/* Show city as subtitle only when place name is different from city */}
                    {place?.name && cityLocation && place.name !== cityLocation && (
                      <div className="mt-0.5 flex items-center gap-1">
                        <PinIcon className="size-3 shrink-0 text-[#6B5F52]" />
                        <span className="text-[12px] text-[#6B5F52]">{cityLocation}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-cards row */}
                <div className="flex gap-2">

                  {/* Walk time — only when GPS */}
                  {hasGPS && (
                    <div className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl bg-white px-2 py-3.5">
                      {routeInfo ? (
                        routeInfo.durationS < 1800 ? (
                          <>
                            <span className="text-[16px] font-bold text-[#1A1613]">{Math.round(routeInfo.durationS / 60)} min</span>
                            <span className="text-[11px] text-[#6B5F52]">walk</span>
                          </>
                        ) : (
                          <>
                            <span className="text-[16px] font-bold text-[#1A1613]">
                              {routeInfo.distanceM < 1000 ? `${Math.round(routeInfo.distanceM)}m` : `${(routeInfo.distanceM / 1000).toFixed(1)}km`}
                            </span>
                            <span className="text-[11px] text-[#6B5F52]">away</span>
                          </>
                        )
                      ) : (
                        <>
                          <span className="text-[16px] font-bold text-[#1A1613]">—</span>
                          <span className="text-[11px] text-[#6B5F52]">walk</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Confirmed count OR "Be the first to verify" */}
                  {showBeFirst ? (
                    <button
                      onClick={() => {
                        const placeId = place?.id ?? post.place_id;
                        const dest = placeId ? `/upload?place_id=${placeId}` : '/upload';
                        if (requireAuth("Sign up to verify this place", dest)) router.push(dest);
                      }}
                      className={`flex flex-col items-center justify-center gap-1 rounded-xl bg-white px-3 py-3.5 text-center ${hasGPS ? "flex-1" : "w-full"}`}
                    >
                      <svg className="size-4 shrink-0 text-[#B85C38]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" />
                      </svg>
                      <span className="text-[10px] font-semibold leading-snug text-[#B85C38]">Be the first to find this place</span>
                    </button>
                  ) : (
                    <div className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl bg-white px-2 py-3.5">
                      <div className="flex items-center gap-1">
                        {/* Green verified badge */}
                        <svg className="size-4 shrink-0" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" fill="#2D7D46" />
                          <path d="M7 12.5l3.5 3.5 6.5-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-[17px] font-bold text-[#2D7D46]">{verifiedCount}</span>
                      </div>
                      <span className="text-[11px] text-[#6B5F52]">confirmed</span>
                    </div>
                  )}

                  {/* Go button — only when GPS */}
                  {hasGPS && (
                    <button
                      onClick={() => setShowMapPicker(true)}
                      className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl bg-[#1A1613] px-2 py-3.5"
                    >
                      {/* Navigation triangle */}
                      <svg className="size-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L4 21h16z" />
                      </svg>
                      <span className="text-[11px] font-semibold text-white">Go</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ── Static map ───────────────────────────────────────────────────────── */}
          {post.lat && post.lng && mapToken && (() => {
            const postPin = `pin-l+fa6460(${post.lng},${post.lat})`;
            const userPin = userCoords ? `,pin-s+4285f4(${userCoords.lng},${userCoords.lat})` : "";
            const viewport = userCoords ? `auto` : `${post.lng},${post.lat},14,0`;
            const padding = userCoords ? "&padding=60" : "";
            const src = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${postPin}${userPin}/${viewport}/600x320@2x?access_token=${mapToken}${padding}`;
            return (
              <div className="mt-4 overflow-hidden rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="Post location map" className="w-full object-cover" />
              </div>
            );
          })()}
        </div>

        {/* ── More shots of this spot ───────────────────────────────────────────── */}
        {place && placePosts.length > 0 && (
          <div className="mt-5 border-t border-[#EDE6D9] pt-5 pb-4">
            <p className="px-4 text-[15px] font-bold text-[#1A1613]">More shots of this spot</p>

            {/* Horizontal scroll — cards match main carousel size */}
            <div className="mt-3 pl-4">
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
              {placePosts.map((p) => (
                <Link
                  key={p.id}
                  href={`/post/${p.id}`}
                  className="flex aspect-[3/4] w-[62%] shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-white"
                >
                  {/* Avatar + username + title */}
                  <div className="flex items-center gap-1.5 px-3 pt-3 pb-1">
                    <div className="size-6 shrink-0 overflow-hidden rounded-full bg-[#EDE6D9]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.user_avatar_url || DEFAULT_AVATAR} alt="" className="h-full w-full object-cover" />
                    </div>
                    <span className="text-[11px] font-semibold text-[#1A1613] shrink-0">{p.user_name || "User"}</span>
                    <span className="min-w-0 truncate text-[11px] text-[#6B5F52]">{p.title}</span>
                  </div>

                  {/* Description */}
                  <p className="px-3 pb-2 text-[11px] leading-snug text-[#6B5F52] line-clamp-2">
                    {p.description || p.title}
                  </p>

                  {/* Photos — fill remaining card height */}
                  <div className="mx-3 mb-3 flex flex-1 gap-1 overflow-hidden rounded-xl">
                    {p.image_urls.slice(0, 3).map((url, i) => (
                      <div key={i} className="flex-1 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={p.title} className="h-full w-full object-cover" />
                      </div>
                    ))}
                  </div>
                </Link>
              ))}
              <div className="w-4 shrink-0" />
            </div>
            </div>
          </div>
        )}

        {/* ── Add your shot of this spot ────────────────────────────────────────── */}
        {(place || post.is_verified) && (
          <div className="px-4 pt-4 pb-10">
            <button
              onClick={() => {
                // Use place.id if loaded, fall back to post.place_id embedded in the post object
                const placeId = place?.id ?? post.place_id;
                const dest = placeId ? `/upload?place_id=${placeId}` : "/upload";
                if (requireAuth("Sign up to add a shot", dest)) router.push(dest);
              }}
              className="flex w-full items-center justify-center gap-2.5 rounded-full border-2 border-dashed border-[#D4C4A8] bg-[#F9F6F0] py-4 text-[15px] font-medium text-[#6B5F52]"
            >
              <CameraAddIcon className="size-5 shrink-0" />
              Add your shot of this spot
            </button>
          </div>
        )}

        {!place && !post.is_verified && <div className="h-10" />}
      </div>

      {/* ── Delete confirmation sheet ─────────────────────────────────────────── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowDeleteConfirm(false)}>
          <div className="w-full rounded-t-2xl bg-[#F9F6F0] px-4 pt-5 pb-8 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 mx-auto h-1 w-10 rounded-full bg-[#D4C4A8]" />
            <p className="mt-4 text-center text-[17px] font-bold text-[#1A1613]">Delete post?</p>
            <p className="mt-1.5 text-center text-[14px] text-[#6B5F52]">This can&apos;t be undone.</p>
            <button
              onClick={handleDelete}
              disabled={deleteLoading}
              className="mt-5 w-full rounded-xl bg-red-500 py-3.5 text-[15px] font-semibold text-white disabled:opacity-60"
            >
              {deleteLoading ? "Deleting..." : "Delete"}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="mt-3 w-full rounded-xl bg-[#EDE6D9] py-3.5 text-[15px] font-semibold text-[#1A1613]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Map picker sheet ──────────────────────────────────────────────────── */}
      {showMapPicker && post?.lat && post?.lng && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setShowMapPicker(false)}>
          <div className="w-full rounded-t-2xl bg-[#F9F6F0] px-4 pt-5 pb-10 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 mx-auto h-1 w-10 rounded-full bg-[#D4C4A8]" />
            <p className="mb-4 text-[16px] font-semibold text-[#1A1613]">Open in Maps</p>
            <a
              href={`https://maps.apple.com/?q=${post.lat},${post.lng}`}
              onClick={() => setShowMapPicker(false)}
              className="flex w-full items-center gap-3 rounded-xl bg-[#EDE6D9] px-4 py-3.5 text-[15px] font-medium text-[#1A1613]"
            >
              <PinIcon className="size-5 shrink-0" />
              Apple Maps
            </a>
            <a
              href={`https://www.google.com/maps?q=${post.lat},${post.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setShowMapPicker(false)}
              className="mt-3 flex w-full items-center gap-3 rounded-xl bg-[#EDE6D9] px-4 py-3.5 text-[15px] font-medium text-[#1A1613]"
            >
              <PinIcon className="size-5 shrink-0" />
              Google Maps
            </a>
            <button
              onClick={() => setShowMapPicker(false)}
              className="mt-3 w-full py-2.5 text-[14px] text-[#6B5F52]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Auth toast ────────────────────────────────────────────────────────── */}
      {authToast && (
        <div className="fixed bottom-8 left-4 right-4 z-50 flex items-center justify-between rounded-2xl bg-[#1A1613] px-5 py-4 shadow-xl">
          <p className="text-[14px] font-medium text-white">{authToast}</p>
          <div className="flex shrink-0 gap-2">
            <Link
              href={authRedirect ? `/register?redirect=${encodeURIComponent(authRedirect)}` : "/register"}
              className="rounded-full border border-white/30 px-3 py-1.5 text-[12px] font-semibold text-white"
            >
              Sign up
            </Link>
            <Link
              href={authRedirect ? `/login?redirect=${encodeURIComponent(authRedirect)}` : "/login"}
              className="rounded-full bg-[#B85C38] px-3 py-1.5 text-[12px] font-semibold text-white"
            >
              Log in
            </Link>
          </div>
        </div>
      )}

      {/* ── Lightbox ─────────────────────────────────────────────────────────── */}
      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black" onClick={() => setLightboxIndex(null)}>
          <button
            className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full bg-white/20 text-white"
            onClick={() => setLightboxIndex(null)}
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {post.image_urls.length > 1 && (
            <span className="absolute left-4 top-5 text-[13px] font-medium text-white/70">
              {lightboxIndex + 1} / {post.image_urls.length}
            </span>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.image_urls[lightboxIndex]}
            alt={post.title}
            className="max-h-screen max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {lightboxIndex > 0 && (
            <button
              className="absolute left-3 top-1/2 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-white/20 text-white"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
          {lightboxIndex < post.image_urls.length - 1 && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-white/20 text-white"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* ── Bottom nav — hidden on entry, slides in on scroll up ─────────────── */}
      <div className={`fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-center border-t border-[#D4C4A8] bg-[#F9F6F0] shadow-[0px_-2px_4px_0px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-in-out ${navVisible ? "translate-y-0" : "translate-y-full"}`}>
        <div className="flex w-[291px] items-center justify-between">
          {([
            { id: "home", label: "Home", href: "/" },
            { id: "create", label: "Create", href: "/upload" },
            { id: "profile", label: "Profile", href: "/profile" },
          ] as const).map(({ id, label, href }) => (
            <button
              key={id}
              onClick={() => {
                if ((id === "create" || id === "profile") && !getToken()) {
                  router.push(id === "create" ? "/login?from=upload" : "/login");
                  return;
                }
                router.push(href);
              }}
              className="flex w-[37px] flex-col items-center"
            >
              {id === "home" && (
                <svg className="size-6 text-[#1A1613]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10.707 2.293a1 1 0 0 1 1.414 0l8 8A1 1 0 0 1 20 12h-1v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9H3a1 1 0 0 1-.707-1.707l8-8Z" />
                </svg>
              )}
              {id === "create" && (
                <svg className="size-6 text-[#1A1613]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
              )}
              {id === "profile" && (
                <svg className="size-6 text-[#1A1613]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )}
              <span className="text-[11px] leading-[1.5] text-[#1A1613]">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
