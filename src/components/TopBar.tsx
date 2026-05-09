import Link from "next/link";

export default function TopBar() {
  return (
    <div className="relative flex items-center justify-center px-4 pt-3">
      <span className="text-[20px] font-bold tracking-tight text-[#1e1e1e]">Aura</span>
      <div className="absolute right-4 flex items-center gap-3">
        <Link href="/friends" aria-label="Find friends">
          <svg className="size-6 text-[#1e1e1e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
        </Link>
        <Link href="/notifications" aria-label="Notifications">
          <svg className="size-6 text-[#1e1e1e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
