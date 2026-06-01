"use client";

import { type ComponentType, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiGet, API_BASE } from "@/lib/api";
import { getToken, saveUserId } from "@/lib/auth";
import TopBar from "@/components/TopBar";
import PostGrid from "@/components/PostGrid";
import type { Post, UserProfile, ArchetypeStats, PublicProfileResponse } from "../../../shared/aura-schema";

const AVATAR =
  "https://www.figma.com/api/mcp/asset/e4add399-8205-4c2a-8782-3da6c9f7bf60";

// ── Icons ─────────────────────────────────────────────────────────────────────

function HomeIcon({ className }: { className?: string; filled?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M10.707 2.293a1 1 0 0 1 1.414 0l8 8A1 1 0 0 1 20 12h-1v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9H3a1 1 0 0 1-.707-1.707l8-8Z" />
    </svg>
  );
}

function PlusSquareIcon({ className }: { className?: string; filled?: boolean }) {
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

function UserIcon({ className, filled }: { className?: string; filled?: boolean }) {
  if (filled) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12Zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8Z" />
      </svg>
    );
  }
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

type NavItem = "home" | "create" | "profile";

const NAV_ITEMS: {
  id: NavItem;
  label: string;
  href: string;
  Icon: ComponentType<{ className?: string; filled?: boolean }>;
}[] = [
  { id: "home", label: "Home", href: "/", Icon: HomeIcon },
  { id: "create", label: "Create", href: "/upload", Icon: PlusSquareIcon },
  { id: "profile", label: "Profile", href: "/profile", Icon: UserIcon },
];

function BottomNav({ active }: { active: NavItem }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 flex h-16 items-center justify-center border-t border-[#d9d9d9] bg-white shadow-[0px_-2px_4px_0px_rgba(0,0,0,0.12)]">
      <div className="flex w-[291px] items-center justify-between">
        {NAV_ITEMS.map(({ id, label, href, Icon }) => (
          <Link
            key={id}
            href={href}
            className="flex w-[37px] flex-col items-center"
          >
            <Icon
              className={`size-6 ${active === id ? "text-[#fa6460]" : "text-[#2c2c2c]"}`}
              filled={active === id}
            />
            <span
              className={`text-[11px] leading-[1.5] ${active === id ? "text-[#fa6460]" : "text-[#2c2c2c]"}`}
            >
              {label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Profile Page ───────────────────────────────────────────────────────────────

const TABS = ["Uploaded", "Saved"] as const;
type Tab = (typeof TABS)[number];

export default function ProfilePage() {
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
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [stats, setStats] = useState<ArchetypeStats>({
    photo_spots: 0,
    wanderings: 0,
    indoor_vibes: 0,
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const token = getToken();
        if (!token) { router.push("/login"); return; }

        // User info
        const userResponse = await apiGet<{ ok: boolean; user: UserProfile }>("/me");
        const userInfo = userResponse.user;
        setUserName(userInfo.name || userInfo.email?.split('@')[0] || '');
        setUserBio(userInfo.bio ?? null);

        const uid = userInfo.user_id;
        if (uid) {
          setUserId(uid);
          saveUserId(uid);

          // Follower / following counts via public profile endpoint
          try {
            const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
            const res = await fetch(`${API_BASE}/api/users/${uid}`, { headers });
            if (res.ok) {
              const data: PublicProfileResponse = await res.json();
              setFollowerCount(data.profile.follower_count);
              setFollowingCount(data.profile.following_count);
            }
          } catch { /* counts stay at 0 */ }
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
  }, [router]);

  const archCategories = [
    { label: "Photo Spots", count: stats.photo_spots },
    { label: "Wanderings", count: stats.wanderings },
    { label: "Indoor Vibes", count: stats.indoor_vibes },
  ].filter(s => s.count > 0);

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

        {/* ── Instagram-style header ── */}
        <div className="flex items-center gap-5 px-4 pt-5">
          {/* Avatar */}
          <div className="size-[86px] shrink-0 overflow-hidden rounded-full border border-[#d9d9d9]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={AVATAR} alt={userName} className="h-full w-full object-cover" />
          </div>

          {/* Posts / Followers / Following */}
          <div className="flex flex-1 items-center justify-around">
            {[
              { label: "Posts", value: uploadedPosts.length },
              { label: "Followers", value: followerCount },
              { label: "Following", value: followingCount },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-0.5">
                <span className="text-[18px] font-bold leading-tight text-[#1e1e1e]">{s.value}</span>
                <span className="text-[12px] text-[#757575]">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Name */}
        {userName && (
          <p className="mt-2 px-4 text-[15px] font-bold text-[#1e1e1e]">{userName}</p>
        )}

        {/* Bio */}
        {userBio && (
          <p className="mt-0.5 px-4 text-[13px] leading-relaxed text-[#757575]">{userBio}</p>
        )}

        {/* Archetype category pills (only when user has posts) */}
        {archCategories.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5 px-4">
            {archCategories.map((s) => (
              <span key={s.label} className="rounded-full bg-[#f3f3f3] px-2.5 py-[3px] text-[11px] font-medium text-[#757575]">
                {s.label} · {s.count}
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

      <BottomNav active="profile" />
    </div>
  );
}
