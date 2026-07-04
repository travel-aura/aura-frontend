"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

function HomeIcon({ className }: { className?: string; filled?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M10.707 2.293a1 1 0 0 1 1.414 0l8 8A1 1 0 0 1 20 12h-1v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9H3a1 1 0 0 1-.707-1.707l8-8Z" />
    </svg>
  );
}

function PlusSquareIcon({ className }: { className?: string; filled?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
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
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

const NAV_ITEMS = [
  { id: "home", label: "Home", href: "/", Icon: HomeIcon },
  { id: "create", label: "Create", href: "/upload", Icon: PlusSquareIcon },
  { id: "profile", label: "Profile", href: "/profile", Icon: UserIcon },
];

function getActive(pathname: string) {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/upload")) return "create";
  if (pathname.startsWith("/profile")) return "profile";
  return "";
}

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { token } = useAuth();
  const active = getActive(pathname);

  const handleNavClick = (id: string, href: string) => {
    if ((id === "create" || id === "profile") && !token) {
      router.push(id === "create" ? "/login?from=upload" : "/login");
      return;
    }
    router.push(href);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 flex h-16 items-center justify-center border-t border-[#D4C4A8] bg-[#F9F6F0] shadow-[0px_-2px_4px_0px_rgba(0,0,0,0.12)]">
      <div className="flex w-[291px] items-center justify-between">
        {NAV_ITEMS.map(({ id, label, href, Icon }) => (
          <button
            key={id}
            onClick={() => handleNavClick(id, href)}
            className="flex w-[37px] flex-col items-center"
          >
            <Icon
              className={`size-6 ${active === id ? "text-[#B85C38]" : "text-[#1A1613]"}`}
              filled={active === id}
            />
            <span className={`text-[11px] leading-[1.5] ${active === id ? "text-[#B85C38]" : "text-[#1A1613]"}`}>
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
