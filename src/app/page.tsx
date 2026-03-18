"use client";

import { type ComponentType, useState, useEffect } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import type { Post } from "../../shared/aura-schema";

// Multi-image indicator icon
function LayersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L2 7l10 5 10-5-10-5z" opacity="0.6"/>
      <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
    </svg>
  );
}

function FeedCard({ post }: { post: Post }) {
  // Format date to show relative time
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
    <div className="flex flex-col gap-1">
      <div className="relative h-[232px] w-full overflow-hidden rounded-lg bg-[#d9d9d9]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.image_urls[0]}
          alt={post.title}
          className="h-full w-full object-cover"
        />
        {/* Multi-image indicator */}
        {post.image_urls.length > 1 && (
          <div className="absolute left-2 top-2">
            <LayersIcon className="size-5 text-white drop-shadow-lg" />
          </div>
        )}
        {/* Archetype badge */}
        <span className="absolute bottom-[10px] right-2 rounded-full bg-[#2c2c2c] px-2 py-0.5 text-[9px] font-medium text-[#f3f3f3] shadow-[0px_0px_4px_0px_rgba(0,0,0,0.12)]">
          {post.archetype_tag}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 pt-0.5">
        <div className="flex items-center gap-1 overflow-hidden">
          {post.is_verified && <span className="shrink-0 text-[11px]">📍</span>}
          <span className="truncate text-[13px] font-semibold leading-tight text-[#1e1e1e]">
            {post.title}
          </span>
        </div>
        {post.description && (
          <p className="truncate text-[13px] leading-tight text-[#757575]">
            {post.description}
          </p>
        )}
        <p className="text-[11px] text-[#999]">{formatDate(post.created_at)}</p>
      </div>
    </div>
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
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

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
  const LIMIT = 10;

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async (loadMore = false) => {
    try {
      setLoading(true);
      const currentOffset = loadMore ? offset : 0;

      const response = await apiGet<{
        ok: boolean;
        auras: Post[];
        pagination: { limit: number; offset: number; count: number };
      }>(`/api/auras/feed?limit=${LIMIT}&offset=${currentOffset}`);

      console.log('Feed response:', response);

      if (loadMore) {
        setPosts(prev => [...prev, ...response.auras]);
      } else {
        setPosts(response.auras);
      }

      setOffset(currentOffset + response.auras.length);
      setHasMore(response.auras.length === LIMIT);
    } catch (err) {
      console.error('Failed to fetch feed:', err);
      setError((err as Error).message || 'Failed to load feed');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    fetchPosts(true);
  };

  // Split posts into two columns for masonry layout
  const leftPosts = posts.filter((_, i) => i % 2 === 0);
  const rightPosts = posts.filter((_, i) => i % 2 === 1);

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-white">
      {/* Logo */}
        <div className="flex justify-center pt-2">
          <span className="text-[20px] font-bold tracking-tight text-[#1e1e1e]">
            Aura
          </span>
        </div>

        {/* Filter tabs */}
        <div className="mt-2 flex items-center justify-center gap-2">
          <button
            onClick={() => setActiveTab("all")}
            className={`rounded-full px-3 py-0.5 text-[15px] font-medium transition-colors ${
              activeTab === "all"
                ? "bg-[#5a5a5a] text-[#f5f5f5]"
                : "text-[#1e1e1e]"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab("following")}
            className={`rounded-full px-3 py-0.5 text-[15px] transition-colors ${
              activeTab === "following"
                ? "bg-[#5a5a5a] text-[#f5f5f5]"
                : "text-[#1e1e1e]"
            }`}
          >
            Following
          </button>
        </div>

        {/* Feed — two-column layout */}
        <div className="mt-4 flex-1 overflow-y-auto px-[7px] pb-20">
          {/* Loading state */}
          {loading && posts.length === 0 && (
            <div className="flex items-center justify-center py-24">
              <p className="text-[15px] text-[#757575]">Loading feed...</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex items-center justify-center py-24">
              <p className="text-[15px] text-red-500">{error}</p>
            </div>
          )}

          {/* Posts grid */}
          {!error && posts.length > 0 && (
            <>
              <div className="flex gap-2">
                {/* Left column */}
                <div className="flex flex-1 flex-col gap-4">
                  {leftPosts.map((post) => (
                    <FeedCard key={post.id} post={post} />
                  ))}
                </div>
                {/* Right column */}
                <div className="flex flex-1 flex-col gap-4">
                  {rightPosts.map((post) => (
                    <FeedCard key={post.id} post={post} />
                  ))}
                </div>
              </div>

              {/* Load more button */}
              {hasMore && (
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="rounded-lg bg-[#ededed] px-6 py-2.5 text-[14px] font-medium text-[#1e1e1e] transition-opacity hover:bg-[#e0e0e0] disabled:opacity-50"
                  >
                    {loading ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Empty state */}
          {!loading && !error && posts.length === 0 && (
            <div className="flex items-center justify-center py-24">
              <p className="text-[15px] text-[#757575]">No posts yet</p>
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
                <Icon
                  className={`size-6 ${
                    activeNav === id ? "text-[#fa6460]" : "text-[#2c2c2c]"
                  }`}
                />
                <span
                  className={`text-[11px] leading-[1.5] ${
                    activeNav === id ? "text-[#fa6460]" : "text-[#2c2c2c]"
                  }`}
                >
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </div>
    </div>
  );
}
