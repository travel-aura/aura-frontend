"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { languageLabel, t } from "@/lib/i18n";
import { getToken } from "@/lib/auth";

function HomeIcon({ filled }: { filled?: boolean }) {
  if (filled) return (
    <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10.707 2.293a1 1 0 0 1 1.414 0l8 8A1 1 0 0 1 20 12h-1v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9H3a1 1 0 0 1-.707-1.707l8-8Z" />
    </svg>
  );
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5Z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

function UserIcon({ filled }: { filled?: boolean }) {
  if (filled) return (
    <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12Zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8Z" />
    </svg>
  );
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function FriendsIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export default function DesktopNav() {
  const { token } = useAuth();
  const [unread, setUnread] = useState(0);
  const { language, cycle } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();

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

  const active =
    pathname === "/" ? "home" :
    pathname.startsWith("/upload") ? "create" :
    pathname.startsWith("/profile") ? "profile" :
    pathname.startsWith("/friends") ? "friends" :
    pathname.startsWith("/notifications") ? "notifications" : "";

  const handleNav = (id: string, href: string) => {
    if ((id === "create" || id === "profile") && !getToken()) {
      router.push(id === "create" ? "/login?from=upload" : "/login");
      return;
    }
    router.push(href);
  };

  const items = [
    { id: "home", href: "/", label: t("home", language), icon: <HomeIcon filled={active === "home"} /> },
    { id: "create", href: "/upload", label: t("create", language), icon: <PlusIcon /> },
    { id: "profile", href: "/profile", label: t("profileNav", language), icon: <UserIcon filled={active === "profile"} /> },
    { id: "friends", href: "/friends", label: t("friendsTitle", language), icon: <FriendsIcon /> },
    { id: "notifications", href: "/notifications", label: t("notificationsTitle", language), icon: (
      <span className="relative">
        <BellIcon />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-[#B85C38] text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </span>
    )},
  ];

  return (
    <div className="hidden lg:flex fixed left-0 top-0 h-full w-[220px] flex-col border-r border-[#D4C4A8] bg-[#F9F6F0] z-50">
      {/* Logo */}
      <Link href="/" className="px-6 pt-8 pb-8">
        <span className="text-[26px] font-bold tracking-tight text-[#B85C38]">Aiyi</span>
      </Link>

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-0.5">
        {items.map(({ id, href, label, icon }) => (
          <button
            key={id}
            onClick={() => handleNav(id, href)}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors text-left ${
              active === id
                ? "bg-[#B85C38]/10 text-[#B85C38]"
                : "text-[#1A1613] hover:bg-[#EDE6D9]"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </nav>

      {/* Language toggle */}
      <div className="px-3 pb-8">
        <button
          onClick={cycle}
          suppressHydrationWarning
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-[#6B5F52] hover:bg-[#EDE6D9] transition-colors"
        >
          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          {languageLabel(language)}
        </button>
      </div>
    </div>
  );
}
