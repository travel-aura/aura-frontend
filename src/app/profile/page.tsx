"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
import { saveUserId } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import TopBar from "@/components/TopBar";
import PostGrid from "@/components/PostGrid";
import BottomNav from "@/components/BottomNav";
import type { Post, UserProfile, ArchetypeStats } from "../../../shared/aura-schema";

const AVATAR =
  "https://www.figma.com/api/mcp/asset/e4add399-8205-4c2a-8782-3da6c9f7bf60";

function TagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

// ── Profile Page ───────────────────────────────────────────────────────────────

const TABS = ["Uploaded", "Saved"] as const;
type Tab = (typeof TABS)[number];

export default function ProfilePage() {
  const { token, ready } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("Uploaded");
  const [uploadedPosts, setUploadedPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [userBio, setUserBio] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [stats, setStats] = useState<ArchetypeStats>({
    photo_spots: 0, wanderings: 0, indoor_vibes: 0,
    city_count: 0, verified_count: 0, follower_count: 0, top_tags: [], cities: [],
  });

  useEffect(() => {
    if (!ready) return;
    if (!token) { router.push("/login"); return; }
    const load = async () => {
      try {
        setLoading(true);

        // User info
        const userResponse = await apiGet<{ ok: boolean; user: UserProfile }>("/me");
        const userInfo = userResponse.user;
        setUserName(userInfo.name || userInfo.email?.split('@')[0] || '');
        setUserBio(userInfo.bio ?? null);

        const uid = userInfo.user_id;
        if (uid) {
          setUserId(uid);
          saveUserId(uid);
        }

        // Posts
        const aurasResponse = await apiGet<{ ok: boolean; auras: Post[] }>("/api/auras/me");
        setUploadedPosts(
          (aurasResponse.auras ?? []).sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
        );

        // Saved posts
        try {
          const savesRes = await apiGet<{ ok: boolean; auras: Post[] }>("/api/saves");
          setSavedPosts(savesRes.auras ?? []);
        } catch { /* endpoint may not exist yet */ }

        // Archetype stats
        try {
          const statsResponse = await apiGet<{ ok: boolean; stats: ArchetypeStats }>("/api/auras/me/stats");
          if (statsResponse.stats) setStats(statsResponse.stats);
        } catch { /* optional */ }

      } catch (err) {
        const msg = (err as Error).message || "Failed to load";
        if (msg.includes("401") || msg.includes("Unauthorized") || msg.includes("Invalid or expired token")) {
          router.push("/login"); return;
        }
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [ready, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const topArchetype = (() => {
    const opts = [
      { name: "Photo Spots", count: stats.photo_spots },
      { name: "Wanderings", count: stats.wanderings },
      { name: "Indoor Vibes", count: stats.indoor_vibes },
    ].filter(o => o.count > 0).sort((a, b) => b.count - a.count);
    return opts[0]?.name ?? null;
  })();

  const topTags = stats.top_tags ?? [];

  const copyShare = async () => {
    const url = userId ? `${window.location.origin}/profile/${userId}` : window.location.href;
    try { await navigator.clipboard.writeText(url); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = url; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); document.body.removeChild(ta);
    }
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-white">
      <TopBar />

      <div className="flex-1 overflow-y-auto pb-20">

        {/* ── Profile header ── */}
        <div className="flex items-start gap-4 px-4 pt-5">
          {/* Avatar */}
          <div className="size-[80px] shrink-0 overflow-hidden rounded-full border border-[#d9d9d9]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={AVATAR} alt={userName} className="h-full w-full object-cover" />
          </div>

          {/* Name + stats */}
          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-bold leading-tight text-[#1e1e1e]">{userName || "—"}</p>
            <div className="mt-2.5 flex items-stretch divide-x divide-[#d9d9d9]">
              <div className="flex flex-1 flex-col items-center gap-0.5 px-1">
                <span className="text-[12px] text-[#757575]">Verified</span>
                <span className="text-[17px] font-bold text-[#1e1e1e]">{stats.verified_count}</span>
              </div>
              <Link href="/profile/cities" className="flex flex-1 flex-col items-center gap-0.5 px-1">
                <span className="text-[12px] text-[#757575]">Cities</span>
                <span className="text-[17px] font-bold text-[#1e1e1e]">{stats.city_count}</span>
              </Link>
              <Link href="/profile/followers" className="flex flex-1 flex-col items-center gap-0.5 px-1">
                <span className="text-[12px] text-[#757575]">Followers</span>
                <span className="text-[17px] font-bold text-[#1e1e1e]">{stats.follower_count}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Bio */}
        {userBio && (
          <p className="mt-2 px-4 text-[13px] leading-relaxed text-[#757575]">{userBio}</p>
        )}

        {/* Tags: top archetype + top user tags */}
        {(topArchetype || topTags.length > 0) && (
          <div className="mt-3 flex flex-wrap gap-2 px-4">
            {topArchetype && (
              <span className="rounded-full bg-[#ededed] px-2.5 py-1 text-[12px] font-medium text-[#1e1e1e]">
                {topArchetype}
              </span>
            )}
            {topTags.map((tag) => (
              <span key={tag} className="flex items-center gap-1 rounded-full bg-[#fff1c2] px-2.5 py-1 text-[12px] font-medium text-[#595959]">
                <TagIcon className="size-3" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-3 flex gap-2 px-4">
          <Link
            href="/profile/edit"
            className="flex-1 rounded-lg bg-[#ededed] py-[8px] text-center text-[13px] font-semibold text-[#1e1e1e]"
          >
            Edit profile
          </Link>
          <button
            onClick={copyShare}
            className="flex-1 rounded-lg bg-[#ededed] py-[8px] text-[13px] font-semibold text-[#1e1e1e] transition-colors"
          >
            {shareCopied ? "Copied!" : "Share profile"}
          </button>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex border-b border-[#d9d9d9]">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="relative flex-1 py-[10px] text-[14px] font-medium text-[#1e1e1e]"
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#fa6460]" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="px-0.5 py-0.5">
          {loading && (
            <div className="flex items-center justify-center py-24">
              <p className="text-[15px] text-[#757575]">Loading...</p>
            </div>
          )}
          {error && !loading && (
            <div className="flex items-center justify-center py-24">
              <p className="text-[15px] text-red-500">{error}</p>
            </div>
          )}
          {!loading && !error && activeTab === "Uploaded" && (
            <PostGrid
              posts={uploadedPosts}
              emptyTitle="No posts yet"
              emptyMessage="You haven't uploaded anything yet."
            />
          )}
          {!loading && !error && activeTab === "Saved" && (
            <PostGrid
              posts={savedPosts}
              emptyTitle="No saved posts"
              emptyMessage="You haven't saved anything yet."
            />
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
