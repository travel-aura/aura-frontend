"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { getToken } from "@/lib/auth";
import PostGrid from "@/components/PostGrid";
import type { PublicProfileResponse, ArchetypeStats, Aura } from "../../../../shared/aura-schema";

const DEFAULT_AVATAR = "https://www.figma.com/api/mcp/asset/e4add399-8205-4c2a-8782-3da6c9f7bf60";

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [profile, setProfile] = useState<PublicProfileResponse["profile"] | null>(null);
  const [posts, setPosts] = useState<Aura[]>([]);
  const [stats, setStats] = useState<ArchetypeStats>({ photo_spots: 0, wanderings: 0, indoor_vibes: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followPending, setFollowPending] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const token = getToken();
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(`${API_BASE}/api/users/${userId}`, { headers });
        if (!res.ok) throw new Error("User not found");
        const data: PublicProfileResponse = await res.json();
        setProfile(data.profile);
        setPosts(data.posts ?? []);
        setStats(data.stats ?? { photo_spots: 0, wanderings: 0, indoor_vibes: 0 });
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    load();
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

  const archCategories = [
    { label: "Photo Spots", count: stats.photo_spots },
    { label: "Wanderings", count: stats.wanderings },
    { label: "Indoor Vibes", count: stats.indoor_vibes },
  ].filter(s => s.count > 0);

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-white">
      {/* Back header with username */}
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

        {/* ── Instagram-style header ── */}
        <div className="flex items-center gap-5 px-4 pt-3">
          {/* Avatar */}
          <div className="size-[86px] shrink-0 overflow-hidden rounded-full border border-[#d9d9d9]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={profile.avatar_url || DEFAULT_AVATAR} alt={profile.name} className="h-full w-full object-cover" />
          </div>

          {/* Posts / Followers / Following */}
          <div className="flex flex-1 items-center justify-around">
            {[
              { label: "Posts", value: profile.post_count },
              { label: "Followers", value: profile.follower_count },
              { label: "Following", value: profile.following_count },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-0.5">
                <span className="text-[18px] font-bold leading-tight text-[#1e1e1e]">{s.value}</span>
                <span className="text-[12px] text-[#757575]">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Name */}
        <p className="mt-2 px-4 text-[15px] font-bold text-[#1e1e1e]">{profile.name}</p>

        {/* Bio */}
        {profile.bio && (
          <p className="mt-0.5 px-4 text-[13px] leading-relaxed text-[#757575]">{profile.bio}</p>
        )}

        {/* Archetype category pills */}
        {archCategories.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5 px-4">
            {archCategories.map((s) => (
              <span key={s.label} className="rounded-full bg-[#f3f3f3] px-2.5 py-[3px] text-[11px] font-medium text-[#757575]">
                {s.label} · {s.count}
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
            className="flex-1 rounded-lg border border-[#d9d9d9] bg-white py-[8px] text-[13px] font-medium text-[#1e1e1e] transition-colors"
          >
            {shareCopied ? "Copied!" : "Share profile"}
          </button>
        </div>

        {/* Posts grid */}
        <div className="mt-4 border-t border-[#d9d9d9]" />
        <div className="px-0.5 py-0.5">
          <PostGrid
            posts={posts}
            emptyTitle="No posts yet"
            emptyMessage="This user hasn't uploaded anything yet."
          />
        </div>
      </div>
    </div>
  );
}
