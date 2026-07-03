"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet, API_BASE } from "@/lib/api";
import { getToken, getUserId } from "@/lib/auth";
import { getCityFromCoordinates } from "@/lib/geocoding";
import { useLanguage } from "@/hooks/useLanguage";
import { translateTag } from "@/lib/i18n";
import type { AuraWithUser, Perspective } from "../../../../shared/aura-schema";

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

function HeartIcon({ className, filled }: { className?: string; filled?: boolean }) {
  if (filled) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function CommentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
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

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

// Formats a naive EXIF datetime string "YYYY-MM-DDTHH:MM:SS" (no TZ suffix)
// into a human-readable string without any timezone conversion.
function formatTakenAt(takenAt: string): string {
  const [datePart, timePart] = takenAt.split('T');
  if (!datePart || !timePart) return takenAt;
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  return `${MONTHS[month - 1]} ${day}, ${year} · ${h12}:${String(minutes).padStart(2, '0')} ${ampm}`;
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
  const [isLiked, setIsLiked] = useState(false);
  const [likePending, setLikePending] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [shareCopied, setShareCopied] = useState(false);
  const [perspectives, setPerspectives] = useState<Perspective[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [authToast, setAuthToast] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

        setPost(foundPost);
        if (foundPost.is_saved !== undefined) setIsSaved(foundPost.is_saved);
        setIsLiked(foundPost.is_liked);
        setLikeCount(foundPost.like_count);
        if (foundPost.perspectives) setPerspectives(foundPost.perspectives);

        const token = getToken();
        const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

        // Fire all secondary requests in parallel — fixed indices, no dynamic shifting
        const [cityTokenResult, userProfileResult, saveResult, perspResult] = await Promise.allSettled([
          // 0: reverse geocode + mapbox token
          foundPost.lat && foundPost.lng
            ? Promise.all([
                getCityFromCoordinates(foundPost.lat, foundPost.lng),
                fetch("/api/mapbox-token").then((r) => r.json()),
              ])
            : Promise.resolve(null),
          // 1: user display name (only if post doesn't include it)
          !foundPost.user?.name && !foundPost.user_name && foundPost.user_id
            ? fetch(`${API_BASE}/api/users/${foundPost.user_id}`, { headers: authHeader })
                .then((r) => r.ok ? r.json() : null)
            : Promise.resolve(null),
          // 2: save state (only if not already embedded in post)
          foundPost.is_saved === undefined
            ? fetch(`${API_BASE}/api/saves/check?aura_id=${foundPost.id}`, { headers: authHeader })
                .then((r) => r.ok ? r.json() : { saved: false })
            : Promise.resolve(null),
          // 3: perspectives (only if not already embedded in post)
          !foundPost.perspectives
            ? fetch(`${API_BASE}/api/auras/${foundPost.id}/perspectives`, { headers: authHeader })
                .then((r) => r.ok ? r.json() : { perspectives: [] })
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
        if (saveResult.status === "fulfilled" && saveResult.value && foundPost.is_saved === undefined) {
          setIsSaved((saveResult.value as { saved: boolean }).saved ?? false);
        }
        if (perspResult.status === "fulfilled" && perspResult.value && !foundPost.perspectives) {
          setPerspectives((perspResult.value as { perspectives: Perspective[] }).perspectives ?? []);
        }
      } catch (err) {
        setError((err as Error).message || "Failed to load post");
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, []);

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
  }, [userCoords?.lat, userCoords?.lng, post?.id, mapToken]);

  const requireAuth = (msg: string) => {
    if (getToken()) return true;
    setAuthToast(msg);
    setTimeout(() => setAuthToast(null), 2500);
    return false;
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${postId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
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

  const handleLike = async () => {
    if (likePending || !post) return;
    setLikePending(true);
    const prev = { isLiked, likeCount };
    const token = getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (isLiked) {
      setIsLiked(false);
      setLikeCount((c) => Math.max(0, c - 1));
    } else {
      setIsLiked(true);
      setLikeCount((c) => c + 1);
    }
    try {
      if (prev.isLiked) {
        await fetch(`${API_BASE}/api/likes/${post.id}`, { method: "DELETE", headers });
      } else {
        await fetch(`${API_BASE}/api/likes`, { method: "POST", headers, body: JSON.stringify({ aura_id: post.id }) });
      }
    } catch {
      setIsLiked(prev.isLiked);
      setLikeCount(prev.likeCount);
    } finally {
      setLikePending(false);
    }
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

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-[#F7F3EC]">
      {/* Header: back + user (left) | share (right) */}
      <div className="flex items-center justify-between px-4 py-3">
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

        <button onClick={handleShare} className="flex items-center justify-center">
          {shareCopied
            ? <span className="text-[12px] font-semibold text-[#B85C38]">Copied!</span>
            : <ShareIcon className="size-6 text-[#1A1613]" />
          }
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto pb-safe">

        {/* Image carousel */}
        <div className="relative pt-4 pl-4">
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
                className="aspect-[3/4] w-[60%] shrink-0 snap-start overflow-hidden rounded-2xl cursor-zoom-in"
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

        {/* Action row: like | comment | ... | save */}
        <div className="flex items-center gap-4 px-4 pt-3 pb-1">
          <button
            onClick={() => { if (requireAuth("Sign up to like posts")) handleLike(); }}
            disabled={likePending}
            className="flex items-center gap-1.5"
          >
            <HeartIcon
              className={`size-6 ${isLiked ? "text-[#B85C38]" : "text-[#1A1613]"}`}
              filled={isLiked}
            />
            {likeCount > 0 && (
              <span className={`text-[14px] font-medium ${isLiked ? "text-[#B85C38]" : "text-[#1A1613]"}`}>
                {likeCount}
              </span>
            )}
          </button>

          <button
            onClick={() => requireAuth("Sign up to comment")}
            className="flex items-center gap-1.5"
          >
            <CommentIcon className="size-6 text-[#1A1613]" />
          </button>

          <div className="flex-1" />

          {isOwnPost ? (
            <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center">
              <TrashIcon className="size-6 text-[#6B5F52]" />
            </button>
          ) : (
            <button onClick={() => requireAuth("Sign up to save posts") && handleSave()} disabled={savePending} className="flex items-center">
              <BookmarkIcon
                className={`size-6 ${isSaved ? "text-[#B85C38]" : "text-[#1A1613]"}`}
                filled={isSaved}
              />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="px-4 pt-3 pb-6">

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
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

          {/* Title */}
          <h1 className="mt-3 text-[22px] font-bold leading-tight text-[#1A1613]">
            {post.title}
          </h1>

          {/* Location */}
          {cityLocation && (
            <div className="mt-1.5 flex items-center gap-1">
              <PinIcon className="size-4 shrink-0 text-[#6B5F52]" />
              <span className="text-[14px] text-[#6B5F52]">{cityLocation}</span>
            </div>
          )}

          {/* Time taken (from EXIF DateTimeOriginal) */}
          {post.taken_at && (
            <div className="mt-1 flex items-center gap-1">
              <CameraIcon className="size-4 shrink-0 text-[#6B5F52]" />
              <span className="text-[14px] text-[#6B5F52]">{formatTakenAt(post.taken_at)}</span>
            </div>
          )}

          {/* Open in Google Maps */}
          {post.lat && post.lng && (
            <a
              href={`https://www.google.com/maps?q=${post.lat},${post.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#EDE6D9] px-4 py-2 text-[13px] font-medium text-[#1A1613] transition-colors hover:bg-[#D4C4A8]"
            >
              <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
              Open in Google Maps
            </a>
          )}

          {/* Description */}
          {post.description && (
            <p className="mt-4 text-[15px] leading-relaxed text-[#6B5F52]">
              {post.description}
            </p>
          )}

          {/* Static map */}
          {post.lat && post.lng && mapToken && (() => {
            const postPin = `pin-l+fa6460(${post.lng},${post.lat})`;
            const userPin = userCoords ? `,pin-s+4285f4(${userCoords.lng},${userCoords.lat})` : "";
            const viewport = userCoords ? `auto` : `${post.lng},${post.lat},14,0`;
            const padding = userCoords ? "&padding=60" : "";
            const src = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${postPin}${userPin}/${viewport}/600x320@2x?access_token=${mapToken}${padding}`;
            return (
              <div className="mt-5">
                <div className="overflow-hidden rounded-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="Post location map" className="w-full object-cover" />
                </div>
                {routeInfo && (
                  <div className="mt-3 flex items-center gap-4 rounded-xl bg-[#EDE6D9] px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <svg className="size-4 shrink-0 text-[#6B5F52]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span className="text-[14px] font-medium text-[#1A1613]">
                        {routeInfo.durationS < 3600
                          ? `${Math.round(routeInfo.durationS / 60)} min walk`
                          : `${Math.floor(routeInfo.durationS / 3600)}h ${Math.round((routeInfo.durationS % 3600) / 60)}m walk`}
                      </span>
                    </div>
                    <div className="h-4 w-px bg-[#D4C4A8]" />
                    <div className="flex items-center gap-1.5">
                      <svg className="size-4 shrink-0 text-[#6B5F52]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                        <circle cx="12" cy="9" r="2.5" />
                      </svg>
                      <span className="text-[14px] font-medium text-[#1A1613]">
                        {routeInfo.distanceM < 1000
                          ? `${Math.round(routeInfo.distanceM)} m away`
                          : `${(routeInfo.distanceM / 1000).toFixed(1)} km away`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Perspectives */}
          {perspectives.length > 0 && (
            <div className="mt-6 border-t border-[#EDE6D9] pt-4">
              <p className="text-[13px] font-semibold text-[#1A1613]">
                {perspectives.length} Perspective{perspectives.length > 1 ? "s" : ""}
              </p>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {perspectives.map((p) => (
                  <Link key={p.id} href={`/post/${p.id}`} className="relative shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.image_urls[0]} alt="Perspective" className="size-24 rounded-xl object-cover" />
                    {p.image_urls.length > 1 && (
                      <span className="absolute right-1.5 top-1.5 text-white text-[10px] drop-shadow">⊞</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation sheet */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowDeleteConfirm(false)}>
          <div className="w-full rounded-t-2xl bg-[#F7F3EC] px-4 pt-5 pb-8 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 h-1 w-10 rounded-full bg-[#D4C4A8] mx-auto" />
            <p className="mt-4 text-center text-[17px] font-bold text-[#1A1613]">Delete post?</p>
            <p className="mt-1.5 text-center text-[14px] text-[#6B5F52]">This can't be undone.</p>
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

      {/* Auth prompt */}
      {authToast && (
        <div className="fixed bottom-20 left-4 right-4 z-50 flex items-center justify-between rounded-2xl bg-[#1A1613] px-5 py-4 shadow-xl">
          <p className="text-[14px] font-medium text-white">{authToast}</p>
          <div className="flex shrink-0 gap-2">
            <Link href="/register" className="rounded-full border border-white/30 px-3 py-1.5 text-[12px] font-semibold text-white">
              Sign up
            </Link>
            <Link href="/login" className="rounded-full bg-[#B85C38] px-3 py-1.5 text-[12px] font-semibold text-white">
              Log in
            </Link>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black" onClick={() => setLightboxIndex(null)}>
          <button
            className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full bg-[#F7F3EC]/20 text-white"
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
              className="absolute left-3 top-1/2 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-[#F7F3EC]/20 text-white"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
          {lightboxIndex < post.image_urls.length - 1 && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-[#F7F3EC]/20 text-white"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
