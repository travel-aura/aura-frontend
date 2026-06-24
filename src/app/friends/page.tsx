"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_BASE } from "@/lib/api";
import { getToken } from "@/lib/auth";

const DEFAULT_AVATAR = "https://www.figma.com/api/mcp/asset/e4add399-8205-4c2a-8782-3da6c9f7bf60";

interface UserResult {
  id: string;
  name?: string;
  email: string;
  avatar_url?: string | null;
  is_following: boolean;
}

export default function FriendsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [followPending, setFollowPending] = useState<Record<string, boolean>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const token = getToken();
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(`${API_BASE}/api/users/search?q=${encodeURIComponent(query.trim())}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setResults(data.users ?? []);
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const handleFollow = async (user: UserResult) => {
    if (followPending[user.id]) return;
    setFollowPending((p) => ({ ...p, [user.id]: true }));
    const token = getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    try {
      if (user.is_following) {
        await fetch(`${API_BASE}/api/follows/${user.id}`, { method: "DELETE", headers });
      } else {
        await fetch(`${API_BASE}/api/follows`, { method: "POST", headers, body: JSON.stringify({ user_id: user.id }) });
      }
      setResults((prev) =>
        prev.map((u) => u.id === user.id ? { ...u, is_following: !u.is_following } : u)
      );
    } catch { /* optimistic state already set */ }
    finally {
      setFollowPending((p) => ({ ...p, [user.id]: false }));
    }
  };

  const displayName = (u: UserResult) => u.name || u.email.split("@")[0];

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-[#f0f0f0]">
        <button onClick={() => window.history.length > 1 ? router.back() : router.push("/")} className="flex items-center justify-center">
          <svg className="size-6 text-[#1e1e1e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-[18px] font-bold text-[#1e1e1e]">Find Friends</h1>
      </div>

      {/* Search input */}
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2 rounded-xl bg-[#f3f3f3] px-3 py-3">
          <svg className="size-4 shrink-0 text-[#757575]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            autoFocus
            placeholder="Search by name or username…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-[16px] text-[#1e1e1e] placeholder-[#9a9a9a] outline-none"
          />
          {query.length > 0 && (
            <button onClick={() => setQuery("")}>
              <svg className="size-4 text-[#757575]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="mt-2 flex-1 overflow-y-auto">
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <p className="text-[14px] text-[#757575]">Searching…</p>
          </div>
        )}

        {/* Empty search state */}
        {!loading && query.length < 2 && (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <svg className="size-12 text-[#d9d9d9]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
            <p className="mt-4 text-[16px] font-semibold text-[#1e1e1e]">Find people on Aura</p>
            <p className="mt-1 text-[13px] text-[#757575]">Search by name or username to connect with friends</p>
          </div>
        )}

        {/* No results */}
        {!loading && query.length >= 2 && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <p className="text-[16px] font-semibold text-[#1e1e1e]">No users found</p>
            <p className="mt-1 text-[13px] text-[#757575]">Try a different name or username</p>
          </div>
        )}

        {/* User list */}
        {!loading && results.length > 0 && (
          <ul>
            {results.map((user) => (
              <li key={user.id} className="flex items-center gap-3 px-4 py-3">
                {/* Avatar → profile link */}
                <Link href={`/profile/${user.id}`} className="size-11 shrink-0 overflow-hidden rounded-full bg-[#f3f3f3]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={user.avatar_url || DEFAULT_AVATAR}
                    alt={displayName(user)}
                    className="h-full w-full object-cover"
                  />
                </Link>

                {/* Name → profile link */}
                <Link href={`/profile/${user.id}`} className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-[#1e1e1e]">
                    {displayName(user)}
                  </p>
                  {user.name && (
                    <p className="truncate text-[12px] text-[#757575]">
                      {user.email.split("@")[0]}
                    </p>
                  )}
                </Link>

                {/* Follow button */}
                <button
                  onClick={() => handleFollow(user)}
                  disabled={followPending[user.id]}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors disabled:opacity-60 ${
                    user.is_following
                      ? "border border-[#d9d9d9] bg-white text-[#1e1e1e]"
                      : "bg-[#fa6460] text-white"
                  }`}
                >
                  {user.is_following ? "Following" : "Follow"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
