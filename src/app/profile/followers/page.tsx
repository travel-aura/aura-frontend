"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_BASE, apiGet } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import type { UserProfile } from "../../../../shared/aura-schema";

const DEFAULT_AVATAR =
  "https://www.figma.com/api/mcp/asset/e4add399-8205-4c2a-8782-3da6c9f7bf60";

type Tab = "followers" | "following";

interface FollowUser {
  id: string;
  name: string;
  email?: string;
  avatar_url: string | null;
  is_following: boolean;
}

// ── Followers / Following Page ─────────────────────────────────────────────────

export default function FollowersPage() {
  const { token, ready } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>("followers");
  const [userName, setUserName] = useState("");
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [followPending, setFollowPending] = useState<Record<string, boolean>>({});
  const [removePending, setRemovePending] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!ready) return;
    if (!token) { router.push("/login"); return; }

    const load = async () => {
      setLoading(true);
      try {
        const tok = getToken();
        const headers: Record<string, string> = {};
        if (tok) headers.Authorization = `Bearer ${tok}`;

        // Fire all 3 requests in parallel — none depend on each other
        const [userRes, followersRes, followingRes] = await Promise.allSettled([
          apiGet<{ ok: boolean; user: UserProfile }>("/me"),
          fetch(`${API_BASE}/api/follows/followers`, { headers }).then((r) =>
            r.ok ? r.json() : { users: [] }
          ),
          fetch(`${API_BASE}/api/follows/following`, { headers }).then((r) =>
            r.ok ? r.json() : { users: [] }
          ),
        ]);

        if (userRes.status === "fulfilled") {
          setUserName(userRes.value.user.name || userRes.value.user.email?.split("@")[0] || "");
        } else {
          const msg = (userRes.reason as Error).message || "";
          if (msg.includes("401") || msg.includes("Unauthorized")) {
            router.push("/login"); return;
          }
        }

        if (followersRes.status === "fulfilled") {
          const raw = followersRes.value;
          setFollowers(raw.users ?? raw.followers ?? []);
        }
        if (followingRes.status === "fulfilled") {
          const raw = followingRes.value;
          const list: FollowUser[] = (raw.users ?? raw.following ?? []).map(
            (u: FollowUser) => ({ ...u, is_following: true })
          );
          setFollowing(list);
        }
      } catch (err) {
        const msg = (err as Error).message;
        if (msg.includes("401") || msg.includes("Unauthorized")) {
          router.push("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [ready, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const displayName = (u: FollowUser) =>
    u.name || u.email?.split("@")[0] || "User";

  const subName = (u: FollowUser) =>
    u.name && u.email ? u.email.split("@")[0] : null;

  // Follow back a follower (or undo)
  const handleFollowBack = async (user: FollowUser) => {
    if (followPending[user.id]) return;
    setFollowPending((p) => ({ ...p, [user.id]: true }));
    const tok = getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (tok) headers.Authorization = `Bearer ${tok}`;
    try {
      if (user.is_following) {
        await fetch(`${API_BASE}/api/follows/${user.id}`, { method: "DELETE", headers });
        setFollowers((prev) =>
          prev.map((u2) => (u2.id === user.id ? { ...u2, is_following: false } : u2))
        );
      } else {
        await fetch(`${API_BASE}/api/follows`, {
          method: "POST",
          headers,
          body: JSON.stringify({ user_id: user.id }),
        });
        setFollowers((prev) =>
          prev.map((u2) => (u2.id === user.id ? { ...u2, is_following: true } : u2))
        );
      }
    } catch { /* keep state */ }
    finally {
      setFollowPending((p) => ({ ...p, [user.id]: false }));
    }
  };

  // Remove someone from your followers
  const handleRemoveFollower = async (user: FollowUser) => {
    if (removePending[user.id]) return;
    // Optimistic remove
    setFollowers((prev) => prev.filter((u2) => u2.id !== user.id));
    setRemovePending((p) => ({ ...p, [user.id]: true }));
    const tok = getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (tok) headers.Authorization = `Bearer ${tok}`;
    try {
      await fetch(`${API_BASE}/api/followers/${user.id}`, { method: "DELETE", headers });
    } catch {
      // Revert if failed
      setFollowers((prev) => [user, ...prev]);
    } finally {
      setRemovePending((p) => ({ ...p, [user.id]: false }));
    }
  };

  // Toggle follow/unfollow for the following tab
  const handleToggleFollow = async (user: FollowUser) => {
    if (followPending[user.id]) return;
    setFollowPending((p) => ({ ...p, [user.id]: true }));
    const tok = getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (tok) headers.Authorization = `Bearer ${tok}`;
    try {
      if (user.is_following) {
        await fetch(`${API_BASE}/api/follows/${user.id}`, { method: "DELETE", headers });
        setFollowing((prev) =>
          prev.map((u2) => (u2.id === user.id ? { ...u2, is_following: false } : u2))
        );
      } else {
        await fetch(`${API_BASE}/api/follows`, {
          method: "POST",
          headers,
          body: JSON.stringify({ user_id: user.id }),
        });
        setFollowing((prev) =>
          prev.map((u2) => (u2.id === user.id ? { ...u2, is_following: true } : u2))
        );
      }
    } catch { /* keep state */ }
    finally {
      setFollowPending((p) => ({ ...p, [user.id]: false }));
    }
  };

  const filteredFollowers = followers.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      displayName(u).toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-white">

      {/* ── Header ── */}
      <div className="flex items-center px-4 pt-4 pb-3 border-b border-[#f0f0f0]">
        <button
          onClick={() =>
            window.history.length > 1 ? router.back() : router.push("/profile")
          }
          className="flex items-center justify-center size-8"
        >
          <svg
            className="size-6 text-[#1e1e1e]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="flex-1 text-center text-[17px] font-bold text-[#1e1e1e]">
          {userName}
        </h1>
        {/* Spacer to balance back button */}
        <div className="size-8" />
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b border-[#d9d9d9]">
        {(["followers", "following"] as Tab[]).map((tab) => {
          const count = tab === "followers" ? followers.length : following.length;
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="relative flex-1 py-3 text-[14px] transition-colors"
            >
              <span
                className={
                  isActive
                    ? "font-bold text-[#1e1e1e]"
                    : "font-normal text-[#757575]"
                }
              >
                {count}{" "}
                {tab}
              </span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#1e1e1e]" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <p className="text-[14px] text-[#757575]">Loading…</p>
          </div>
        ) : activeTab === "followers" ? (
          <FollowersList
            followers={filteredFollowers}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onFollowBack={handleFollowBack}
            onRemove={handleRemoveFollower}
            followPending={followPending}
            removePending={removePending}
            displayName={displayName}
            subName={subName}
            hasSearch={followers.length > 0}
          />
        ) : (
          <FollowingList
            following={following}
            onToggle={handleToggleFollow}
            followPending={followPending}
            displayName={displayName}
            subName={subName}
          />
        )}
      </div>
    </div>
  );
}

// ── Followers sub-view ─────────────────────────────────────────────────────────

function FollowersList({
  followers,
  searchQuery,
  onSearchChange,
  onFollowBack,
  onRemove,
  followPending,
  removePending,
  displayName,
  subName,
  hasSearch,
}: {
  followers: FollowUser[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onFollowBack: (u: FollowUser) => void;
  onRemove: (u: FollowUser) => void;
  followPending: Record<string, boolean>;
  removePending: Record<string, boolean>;
  displayName: (u: FollowUser) => string;
  subName: (u: FollowUser) => string | null;
  hasSearch: boolean;
}) {
  return (
    <>
      {/* Search bar */}
      {hasSearch && (
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2 rounded-xl bg-[#f3f3f3] px-3 py-3">
            <svg
              className="size-4 shrink-0 text-[#757575]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="flex-1 bg-transparent text-[16px] text-[#1e1e1e] placeholder-[#9a9a9a] outline-none"
            />
            {searchQuery && (
              <button onClick={() => onSearchChange("")}>
                <svg
                  className="size-4 text-[#757575]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {followers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <svg
            className="size-12 text-[#d9d9d9]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
          </svg>
          <p className="mt-4 text-[16px] font-semibold text-[#1e1e1e]">
            {searchQuery ? "No results found" : "No followers yet"}
          </p>
          {!searchQuery && (
            <p className="mt-1 text-[13px] text-[#757575]">
              When people follow you, they&apos;ll appear here
            </p>
          )}
        </div>
      ) : (
        <ul>
          {followers.map((user) => (
            <li key={user.id} className="flex items-center gap-3 px-4 py-3">
              {/* Avatar → profile link */}
              <Link href={`/profile/${user.id}`} className="size-[54px] shrink-0 overflow-hidden rounded-full bg-[#f3f3f3]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={user.avatar_url || DEFAULT_AVATAR}
                  alt={displayName(user)}
                  className="h-full w-full object-cover"
                />
              </Link>

              {/* Name + follow back */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center flex-wrap gap-x-1">
                  <Link
                    href={`/profile/${user.id}`}
                    className="text-[15px] font-semibold text-[#1e1e1e]"
                  >
                    {displayName(user)}
                  </Link>
                  {!user.is_following && (
                    <>
                      <span className="text-[14px] text-[#b0b0b0]">·</span>
                      <button
                        onClick={() => onFollowBack(user)}
                        disabled={followPending[user.id]}
                        className="text-[13px] font-semibold text-[#3478f6] disabled:opacity-50"
                      >
                        Follow back
                      </button>
                    </>
                  )}
                </div>
                {subName(user) && (
                  <p className="truncate text-[12px] text-[#757575]">{subName(user)}</p>
                )}
              </div>

              {/* Remove button */}
              <button
                onClick={() => onRemove(user)}
                disabled={removePending[user.id]}
                className="shrink-0 rounded-lg border border-[#d9d9d9] bg-white px-4 py-[7px] text-[13px] font-semibold text-[#1e1e1e] active:bg-[#f3f3f3] disabled:opacity-50"
              >
                {removePending[user.id] ? "…" : "Remove"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// ── Following sub-view ─────────────────────────────────────────────────────────

function FollowingList({
  following,
  onToggle,
  followPending,
  displayName,
  subName,
}: {
  following: FollowUser[];
  onToggle: (u: FollowUser) => void;
  followPending: Record<string, boolean>;
  displayName: (u: FollowUser) => string;
  subName: (u: FollowUser) => string | null;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = following.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      displayName(u).toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      {/* Search bar */}
      {following.length > 0 && (
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2 rounded-xl bg-[#f3f3f3] px-3 py-3">
            <svg
              className="size-4 shrink-0 text-[#757575]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-[16px] text-[#1e1e1e] placeholder-[#9a9a9a] outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")}>
                <svg
                  className="size-4 text-[#757575]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <svg
            className="size-12 text-[#d9d9d9]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
          <p className="mt-4 text-[16px] font-semibold text-[#1e1e1e]">
            {searchQuery ? "No results found" : "Not following anyone yet"}
          </p>
          {!searchQuery && (
            <p className="mt-1 text-[13px] text-[#757575]">
              Follow people to see them here
            </p>
          )}
        </div>
      ) : (
        <ul>
          {filtered.map((user) => (
            <li key={user.id} className="flex items-center gap-3 px-4 py-3">
              {/* Avatar → profile link */}
              <Link href={`/profile/${user.id}`} className="size-[54px] shrink-0 overflow-hidden rounded-full bg-[#f3f3f3]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={user.avatar_url || DEFAULT_AVATAR}
                  alt={displayName(user)}
                  className="h-full w-full object-cover"
                />
              </Link>

              {/* Name → profile link */}
              <div className="min-w-0 flex-1">
                <Link href={`/profile/${user.id}`} className="block">
                  <p className="text-[15px] font-semibold text-[#1e1e1e]">
                    {displayName(user)}
                  </p>
                  {subName(user) && (
                    <p className="truncate text-[12px] text-[#757575]">
                      {subName(user)}
                    </p>
                  )}
                </Link>
              </div>

              {/* Following / Follow toggle */}
              <button
                onClick={() => onToggle(user)}
                disabled={followPending[user.id]}
                className={`shrink-0 rounded-lg px-4 py-[7px] text-[13px] font-semibold transition-colors disabled:opacity-50 ${
                  user.is_following
                    ? "border border-[#d9d9d9] bg-white text-[#1e1e1e] active:bg-[#f3f3f3]"
                    : "bg-[#fa6460] text-white active:bg-[#e55550]"
                }`}
              >
                {followPending[user.id]
                  ? "…"
                  : user.is_following
                  ? "Following"
                  : "Follow"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
