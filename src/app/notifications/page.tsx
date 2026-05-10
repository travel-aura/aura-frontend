"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_BASE } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { Notification } from "../../../shared/aura-schema";

const DEFAULT_AVATAR = "https://www.figma.com/api/mcp/asset/e4add399-8205-4c2a-8782-3da6c9f7bf60";

function formatDate(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const day = Math.floor(h / 24);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (day < 7) return `${day}d ago`;
  return new Date(d).toLocaleDateString();
}

function notificationText(n: Notification) {
  switch (n.type) {
    case "follow":
      return { main: `${n.actor_name} started following you` };
    case "save":
      return { main: `${n.actor_name} saved your post`, sub: n.aura_title };
    case "perspective":
      return { main: `${n.actor_name} added a perspective to`, sub: n.aura_title };
    default:
      return { main: "New notification" };
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [followPending, setFollowPending] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const token = getToken();
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(`${API_BASE}/api/notifications`, { headers });
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications ?? []);
          // Mark all as read
          fetch(`${API_BASE}/api/notifications/read`, { method: "PATCH", headers }).catch(() => {});
        }
      } catch { /* endpoint not ready */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleFollowBack = async (n: Notification) => {
    if (followPending[n.id]) return;
    setFollowPending((p) => ({ ...p, [n.id]: true }));
    const token = getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    try {
      if (n.is_following) {
        await fetch(`${API_BASE}/api/follows/${n.actor_id}`, { method: "DELETE", headers });
      } else {
        await fetch(`${API_BASE}/api/follows`, { method: "POST", headers, body: JSON.stringify({ user_id: n.actor_id }) });
      }
      setNotifications((prev) =>
        prev.map((notif) => notif.id === n.id ? { ...notif, is_following: !notif.is_following } : notif)
      );
    } catch { /* keep state */ }
    finally { setFollowPending((p) => ({ ...p, [n.id]: false })); }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-[#f0f0f0]">
        <button onClick={() => window.history.length > 1 ? router.back() : router.push("/")} className="flex items-center justify-center">
          <svg className="size-6 text-[#1e1e1e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-[18px] font-bold text-[#1e1e1e]">Notifications</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <p className="text-[14px] text-[#757575]">Loading…</p>
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
            <svg className="size-14 text-[#d9d9d9]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <p className="mt-5 text-[17px] font-semibold text-[#1e1e1e]">All caught up</p>
            <p className="mt-1 text-[13px] text-[#757575]">You have no new notifications</p>
          </div>
        )}

        {!loading && notifications.length > 0 && (
          <ul className="divide-y divide-[#f3f3f3]">
            {notifications.map((n) => {
              const { main, sub } = notificationText(n);
              return (
                <li key={n.id} className={`flex items-start gap-3 px-4 py-3 ${!n.read ? "bg-[#fff8f8]" : ""}`}>
                  {/* Avatar — taps to public profile */}
                  <Link href={`/profile/${n.actor_id}`} className="mt-0.5 shrink-0">
                    <div className="size-10 overflow-hidden rounded-full bg-[#f3f3f3]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={n.actor_avatar || DEFAULT_AVATAR} alt={n.actor_name} className="h-full w-full object-cover" />
                    </div>
                  </Link>

                  {/* Text */}
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] leading-snug text-[#1e1e1e]">
                      <Link href={`/profile/${n.actor_id}`} className="font-semibold">
                        {n.actor_name}
                      </Link>
                      {" "}
                      {n.type === "follow" ? "started following you" : n.type === "save" ? "saved your post" : "added a perspective to"}
                      {sub && n.aura_id && (
                        <>
                          {" "}
                          <Link href={`/post/${n.aura_id}`} className="font-semibold underline-offset-2 hover:underline">
                            {sub}
                          </Link>
                        </>
                      )}
                    </p>
                    <p className="mt-0.5 text-[12px] text-[#9a9a9a]">{formatDate(n.created_at)}</p>
                  </div>

                  {/* Follow-back button for follow notifications */}
                  {n.type === "follow" && (
                    <button
                      onClick={() => handleFollowBack(n)}
                      disabled={followPending[n.id]}
                      className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold transition-colors disabled:opacity-60 ${
                        n.is_following
                          ? "border border-[#d9d9d9] bg-white text-[#1e1e1e]"
                          : "bg-[#fa6460] text-white"
                      }`}
                    >
                      {n.is_following ? "Following" : "Follow back"}
                    </button>
                  )}

                  {/* Unread dot for non-follow notifications */}
                  {n.type !== "follow" && !n.read && (
                    <div className="mt-2 size-2 shrink-0 rounded-full bg-[#fa6460]" />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
