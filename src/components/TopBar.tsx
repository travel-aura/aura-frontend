"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { languageLabel } from "@/lib/i18n";

export default function TopBar() {
  const { token } = useAuth();
  const [unread, setUnread] = useState(0);
  const { language, cycle } = useLanguage();

  useEffect(() => {
    if (!token) { setUnread(0); return; }
    const controller = new AbortController();
    fetch(`${API_BASE}/api/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then((r) => r.ok ? r.json() : { notifications: [] })
      .then((data) => {
        const count = (data.notifications ?? []).filter((n: { read: boolean }) => !n.read).length;
        setUnread(count);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [token]);

  return (
    <div className="relative flex items-center justify-center px-4 pt-3">
      {/* Language cycle button — always visible, no login required */}
      <button
        onClick={cycle}
        suppressHydrationWarning
        className="absolute left-4 rounded-full bg-[#EDE6D9] px-2.5 py-1 text-[12px] font-semibold text-[#1A1613]"
      >
        {languageLabel(language)}
      </button>

      <span className="text-[20px] font-bold tracking-tight text-[#B85C38]">Aura</span>
      {token && (
        <div className="absolute right-4 flex items-center gap-3">
          <Link href="/friends" aria-label="Find friends">
            <svg className="size-6 text-[#1A1613]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          </Link>
          <Link href="/notifications" aria-label="Notifications" className="relative">
            <svg className="size-6 text-[#1A1613]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-[#B85C38] text-[9px] font-bold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
        </div>
      )}
    </div>
  );
}
