"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { getToken } from "@/lib/auth";
import PostGrid from "@/components/PostGrid";
import type { PublicProfileResponse, ArchetypeStats, Aura, Post } from "../../../../shared/aura-schema";

function TagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

const DEFAULT_AVATAR = "https://www.figma.com/api/mcp/asset/e4add399-8205-4c2a-8782-3da6c9f7bf60";

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [profile, setProfile] = useState<PublicProfileResponse["profile"] | null>(null);
  const [posts, setPosts] = useState<Aura[]>([]);
  const [stats, setStats] = useState<ArchetypeStats>({
    photo_spots: 0, wanderings: 0, indoor_vibes: 0,
    city_count: 0, verified_count: 0, follower_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followPending, setFollowPending] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        setLoading(true);
        const token = getToken();
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(`${API_BASE}/api/users/${userId}`, { headers, signal: controller.signal });
        if (!res.ok) throw new Error("User not found");
        const data: PublicProfileResponse = await res.json();
        setProfile(data.profile);
        setPosts(data.posts ?? []);
        setStats(data.stats ?? { photo_spots: 0, wanderings: 0, indoor_vibes: 0, city_count: 0, verified_count: 0, follower_count: 0 });
      } catch (err) {
        if ((err as Error).name !== "AbortError") setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [userId]);

  const handleFollow = async () => {
    if (!profile || followPending) return;
    setFollowPending(true);
    const token = getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    try {
      if (profile.is_following) {
        await fetch(`${API_BASE}/api/follows/${profile.user_id}`, { method: "DELETE", headers });
        setProfile((p) => p ? { ...p, is_following: false, follower_count: p.follower_count - 1 } : p);
      } else {
        await fetch(`${API_BASE}/api/follows`, { method: "POST", headers, body: JSON.stringify({ user_id: profile.user_id }) });
        setProfile((p) => p ? { ...p, is_following: true, follower_count: p.follower_count + 1 } : p);
      }
    } catch { /* keep optimistic state */ }
    finally { setFollowPending(false); }
  };

  const copyShare = async () => {
    const url = `${window.location.origin}/profile/${userId}`;
    try { await navigator.clipboard.writeText(url); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = url; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); document.body.removeChild(ta);
    }
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-[15px] text-[#757575]">Loading...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
        <p className="text-[15px] font-semibold text-red-600">{error || "User not found"}</p>
        <button onClick={() => router.back()} className="mt-4 rounded-lg bg-[#ededed] px-4 py-2 text-[14px] font-medium text-[#1e1e1e]">
          Go Back
        </button>
      </div>
    );
  }

  const topArchetype = (() => {
    const opts = [
      { name: "Photo Spots", count: stats.photo_spots },
      { name: "Wanderings", count: stats.wanderings },
      { name: "Indoor Vibes", count: stats.indoor_vibes },
    ].filter(o => o.count > 0).sort((a, b) => b.count - a.count);
    return opts[0]?.name ?? null;
  })();

  const tagFreq: Record<string, number> = {};
  posts.forEach(p => {
    (p.tags ?? []).forEach(t => { tagFreq[t] = (tagFreq[t] ?? 0) + 1; });
  });
  const topTags = Object.entries(tagFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t);

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-white">
      {/* Back header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button
          onClick={() => window.history.length > 1 ? router.back() : router.push("/")}
          className="flex items-center"
        >
          <svg className="size-6 text-[#1e1e1e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="text-[17px] font-bold text-[#1e1e1e]">{profile.name}</span>
      </div>

      <div className="flex-1 overflow-y-auto pb-6">

        {/* ── Profile header ── */}
        <div className="flex items-start gap-4 px-4 pt-3">
          {/* Avatar */}
          <div className="size-[80px] shrink-0 overflow-hidden rounded-full border border-[#d9d9d9]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={profile.avatar_url || DEFAULT_AVATAR} alt={profile.name} className="h-full w-full object-cover" />
          </div>

          {/* Name + stats */}
          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-bold leading-tight text-[#1e1e1e]">{profile.name}</p>
            <div className="mt-2.5 flex items-stretch divide-x divide-[#d9d9d9]">
              {[
                { label: "Verified", value: stats.verified_count },
                { label: "Cities", value: stats.city_count },
                { label: "Followers", value: stats.follower_count },
              ].map((s) => (
                <div key={s.label} className="flex flex-1 flex-col items-center gap-0.5 px-1">
                  <span className="text-[12px] text-[#757575]">{s.label}</span>
                  <span className="text-[17px] font-bold text-[#1e1e1e]">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="mt-2 px-4 text-[13px] leading-relaxed text-[#757575]">{profile.bio}</p>
        )}

        {/* Tags: top archetype + top user tags */}
        {(topArchetype || topTags.length > 0) && (
          <div className="mt-3 flex flex-wrap gap-2 px-4">
            {topArchetype && (
              <span className="rounded-full bg-[#ededed] px-3 py-1.5 text-[13px] font-medium text-[#1e1e1e]">
                {topArchetype}
              </span>
            )}
            {topTags.map((tag) => (
              <span key={tag} className="flex items-center gap-1.5 rounded-full bg-[#fff1c2] px-3 py-1.5 text-[13px] font-medium text-[#595959]">
                <TagIcon className="size-3" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Follow + Share buttons */}
        <div className="mt-3 flex gap-2 px-4">
          <button
            onClick={handleFollow}
            disabled={followPending}
            className={`flex-1 rounded-lg py-[8px] text-[13px] font-semibold transition-colors disabled:opacity-60 ${
              profile.is_following
                ? "border border-[#d9d9d9] bg-white text-[#1e1e1e]"
                : "bg-[#fa6460] text-white"
            }`}
          >
            {profile.is_following ? "Following" : "Follow"}
          </button>
          <button
            onClick={copyShare}
            className="flex-1 rounded-lg bg-[#ededed] py-[8px] text-[13px] font-medium text-[#1e1e1e] transition-colors"
          >
            {shareCopied ? "Copied!" : "Share profile"}
          </button>
        </div>

        {/* Posts grid */}
        <div className="mt-4 border-t border-[#d9d9d9]" />
        <div className="px-0.5 py-0.5">
          {posts.length === 0 && profile.post_count > 0 ? (
            <div className="flex flex-col items-center justify-center py-24">
              <p className="text-[17px] font-semibold text-[#1e1e1e]">Posts unavailable</p>
              <p className="mt-1 text-center text-[13px] text-[#757575]">Could not load posts right now.</p>
            </div>
          ) : (
            <PostGrid
              posts={posts}
              emptyTitle="No posts yet"
              emptyMessage="This user hasn't uploaded anything yet."
            />
          )}
        </div>
      </div>
    </div>
  );
}
