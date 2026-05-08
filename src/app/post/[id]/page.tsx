"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
import { getCityFromCoordinates } from "@/lib/geocoding";
import type { Aura } from "../../../../shared/aura-schema";

const DEFAULT_AVATAR = "https://www.figma.com/api/mcp/asset/e4add399-8205-4c2a-8782-3da6c9f7bf60";

// ── Icons ─────────────────────────────────────────────────────────────────────

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="15 18 9 12 15 6" />
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
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

// ── Post Detail Page ───────────────────────────────────────────────────────────

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;

  const [post, setPost] = useState<Aura | null>(null);
  const [cityLocation, setCityLocation] = useState<string | null>(null);
  const [mapToken, setMapToken] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        console.log("Fetching post:", postId);

        // Try to fetch the specific post by ID
        // If backend has GET /api/auras/:id endpoint, use it
        // Otherwise fallback to fetching from feed
        let foundPost: Aura | undefined;

        try {
          // Try dedicated endpoint first
          const directResponse = await apiGet<{ ok: boolean; aura: Aura }>(
            `/api/auras/${postId}`
          );
          foundPost = directResponse.aura;
          console.log("Fetched post directly:", foundPost);
        } catch (directError) {
          console.log("Direct fetch failed, trying feed:", directError);

          // Fallback: fetch from feed and find the post
          const feedResponse = await apiGet<{ ok: boolean; auras: Aura[] }>(
            "/api/auras/feed?limit=100&offset=0"
          );
          foundPost = feedResponse.auras.find((p) => p.id === postId);
          console.log("Found post from feed:", foundPost);
        }

        if (!foundPost) {
          setError("Post not found");
          return;
        }

        setPost(foundPost);

        // Get city location and map token
        if (foundPost.lat && foundPost.lng) {
          try {
            const [city, tokenRes] = await Promise.all([
              getCityFromCoordinates(foundPost.lat, foundPost.lng),
              fetch("/api/mapbox-token").then((r) => r.json()),
            ]);
            setCityLocation(city);
            setMapToken(tokenRes.token ?? "");
          } catch {
            setCityLocation(`${foundPost.lat.toFixed(4)}, ${foundPost.lng.toFixed(4)}`);
          }
        }
      } catch (err) {
        console.error("Failed to fetch post:", err);
        setError((err as Error).message || "Failed to load post");
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-[15px] text-[#757575]">Loading...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
        <p className="text-[15px] font-semibold text-red-600">
          {error || "Post not found"}
        </p>
        <button
          onClick={() => router.back()}
          className="mt-4 rounded-lg bg-[#ededed] px-4 py-2 text-[14px] font-medium text-[#1e1e1e]"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#d9d9d9] px-4 py-3">
        <button onClick={() => router.back()} className="flex items-center">
          <ChevronLeftIcon className="size-6 text-[#1e1e1e]" />
        </button>

        <div className="flex items-center gap-2">
          <div className="size-8 overflow-hidden rounded-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.user?.avatar_url || DEFAULT_AVATAR}
              alt={post.user?.name || "User"}
              className="h-full w-full object-cover"
            />
          </div>
          <span className="text-[15px] font-semibold text-[#1e1e1e]">
            {post.user?.name || post.user?.email?.split("@")[0] || "User"}
          </span>
        </div>

        <button
          onClick={() => setIsFavorited(!isFavorited)}
          className="flex items-center"
        >
          <HeartIcon
            className={`size-6 ${isFavorited ? "text-[#fa6460]" : "text-[#1e1e1e]"}`}
            filled={isFavorited}
          />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto pb-safe">
        {/* Image carousel */}
        <div className="relative bg-white px-4 pt-4">
          <div
            className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide"
            onScroll={(e) => {
              const scrollLeft = e.currentTarget.scrollLeft;
              const itemWidth = e.currentTarget.scrollWidth / post.image_urls.length;
              const index = Math.round(scrollLeft / itemWidth);
              setActiveImageIndex(index);
            }}
          >
            {post.image_urls.map((url, index) => (
              <div
                key={index}
                className="aspect-[3/4] w-[60%] shrink-0 snap-start overflow-hidden rounded-2xl"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`${post.title} - Image ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>

          {/* Image indicator dots */}
          {post.image_urls.length > 1 && (
            <div className="mt-3 flex justify-center gap-1.5">
              {post.image_urls.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 rounded-full transition-all ${
                    index === activeImageIndex
                      ? "w-6 bg-[#1e1e1e]"
                      : "w-1.5 bg-[#d9d9d9]"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Post details */}
        <div className="px-4 py-4">
          {/* Title */}
          <h1 className="text-[24px] font-bold leading-tight text-[#1e1e1e]">
            {post.title}
          </h1>

          {/* Location */}
          {cityLocation && (
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[15px] text-[#757575]">{cityLocation}</span>
              {post.lat && post.lng && (
                <a
                  href={`https://www.google.com/maps?q=${post.lat},${post.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-[#ededed] px-3 py-1.5 text-[13px] font-medium text-[#1e1e1e] transition-colors hover:bg-[#e0e0e0]"
                >
                  Open in Google Maps
                </a>
              )}
            </div>
          )}

          {/* Archetype badge */}
          <div className="mt-3">
            <span className="inline-block rounded-full bg-[#2c2c2c] px-3 py-1.5 text-[13px] font-medium text-[#f3f3f3]">
              {post.archetype_tag}
            </span>
          </div>

          {/* Description */}
          {post.description && (
            <p className="mt-4 text-[15px] leading-relaxed text-[#757575]">
              {post.description}
            </p>
          )}

          {/* Static map */}
          {post.lat && post.lng && mapToken && (
            <div className="mt-5 overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-l+fa6460(${post.lng},${post.lat})/${post.lng},${post.lat},14,0/600x320@2x?access_token=${mapToken}`}
                alt="Post location map"
                className="w-full object-cover"
              />
            </div>
          )}

          {/* Metadata */}
          {post.is_verified && (
            <div className="mt-6 border-t border-[#f3f3f3] pt-4">
              <p className="text-[13px] font-medium text-[#1e1e1e]">
                Location Verified
              </p>
              <div className="mt-2 flex flex-col gap-1 text-[13px] text-[#757575]">
                {post.lat && post.lng && (
                  <p>
                    Coordinates: {post.lat.toFixed(6)}, {post.lng.toFixed(6)}
                  </p>
                )}
                {post.altitude !== undefined && post.altitude > 0 && (
                  <p>Altitude: {post.altitude.toFixed(1)}m</p>
                )}
                {post.heading !== undefined && post.heading > 0 && (
                  <p>Heading: {post.heading.toFixed(0)}°</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
