"use client";

import { type ComponentType, useState } from "react";
import Link from "next/link";

// Figma asset URLs (expire in 7 days — swap with real assets)
const ASSETS = {
  yosemiteLeft:
    "https://www.figma.com/api/mcp/asset/c6bb1c02-5591-4678-a799-77dfc001d563",
  kyoto:
    "https://www.figma.com/api/mcp/asset/664a6573-012e-4144-85ca-4ec7bded6c31",
  leftPlaceholder:
    "https://www.figma.com/api/mcp/asset/24feac19-fd45-4bf7-b520-dc5e40a9f84c",
  yosemiteRight:
    "https://www.figma.com/api/mcp/asset/7a674c82-f255-44d2-ba3d-d1b001dc86fd",
  goldCoast:
    "https://www.figma.com/api/mcp/asset/9927e25f-215a-4156-86a7-8ea9e92011af",
  avatar:
    "https://www.figma.com/api/mcp/asset/e4add399-8205-4c2a-8782-3da6c9f7bf60",
};

interface Post {
  id: string;
  image: string;
  flag: string;
  location: string;
  cityTime: string;
  username: string;
  badge: string;
}

const leftPosts: Post[] = [
  {
    id: "1",
    image: ASSETS.yosemiteLeft,
    flag: "🇺🇸",
    location: "Yosemite National Park",
    cityTime: "California • 7:20am",
    username: "Username",
    badge: "The Spot",
  },
  {
    id: "2",
    image: ASSETS.kyoto,
    flag: "🇯🇵",
    location: "Tetsugaku no Michi",
    cityTime: "Kyoto • 7:20am",
    username: "Username",
    badge: "The Path",
  },
];

const rightPosts: Post[] = [
  {
    id: "3",
    image: ASSETS.yosemiteRight,
    flag: "🇺🇸",
    location: "Yosemite National Park",
    cityTime: "California • 6:20am",
    username: "Username",
    badge: "The Spot",
  },
  {
    id: "4",
    image: ASSETS.goldCoast,
    flag: "🇦🇺",
    location: "Gold Coast",
    cityTime: "Gold Coast • 1:11pm",
    username: "Username",
    badge: "The Angle",
  },
];

function FeedCard({ post }: { post: Post }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="relative h-[232px] w-full overflow-hidden rounded-lg bg-[#d9d9d9]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.image}
          alt={post.location}
          className="h-full w-full object-cover"
        />
        <span className="absolute bottom-[10px] right-2 rounded-full bg-[#2c2c2c] px-2 py-0.5 text-[9px] font-medium text-[#f3f3f3] shadow-[0px_0px_4px_0px_rgba(0,0,0,0.12)]">
          {post.badge}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 pt-0.5">
        <div className="flex items-center gap-1 overflow-hidden">
          <span className="shrink-0 text-[11px]">{post.flag}</span>
          <span className="truncate text-[13px] font-semibold leading-tight text-[#1e1e1e]">
            {post.location}
          </span>
        </div>
        <p className="text-[13px] leading-tight text-[#757575]">{post.cityTime}</p>
        <div className="mt-0.5 flex items-center gap-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ASSETS.avatar}
            alt={post.username}
            className="size-[18px] rounded-full object-cover"
          />
          <span className="text-[11px] text-[rgba(17,17,17,0.8)]">
            {post.username}
          </span>
        </div>
      </div>
    </div>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M10.707 2.293a1 1 0 0 1 1.414 0l8 8A1 1 0 0 1 20 12h-1v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9H3a1 1 0 0 1-.707-1.707l8-8Z" />
    </svg>
  );
}

function PlusSquareIcon({ className }: { className?: string }) {
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

function UserIcon({ className }: { className?: string }) {
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

type Tab = "all" | "following";
type NavItem = "home" | "create" | "profile";

export default function AuraFeed() {
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [activeNav, setActiveNav] = useState<NavItem>("home");

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-white">
      {/* Logo */}
        <div className="flex justify-center pt-2">
          <span className="text-[20px] font-bold tracking-tight text-[#1e1e1e]">
            Aura
          </span>
        </div>

        {/* Filter tabs */}
        <div className="mt-2 flex items-center justify-center gap-2">
          <button
            onClick={() => setActiveTab("all")}
            className={`rounded-full px-3 py-0.5 text-[15px] font-medium transition-colors ${
              activeTab === "all"
                ? "bg-[#5a5a5a] text-[#f5f5f5]"
                : "text-[#1e1e1e]"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab("following")}
            className={`rounded-full px-3 py-0.5 text-[15px] transition-colors ${
              activeTab === "following"
                ? "bg-[#5a5a5a] text-[#f5f5f5]"
                : "text-[#1e1e1e]"
            }`}
          >
            Following
          </button>
        </div>

        {/* Feed — two-column layout */}
        <div className="mt-4 flex-1 overflow-y-auto px-[7px] pb-20">
          <div className="flex gap-2">
            {/* Left column */}
            <div className="flex flex-1 flex-col gap-4">
              {leftPosts.map((post) => (
                <FeedCard key={post.id} post={post} />
              ))}
              {/* Placeholder (3rd card, no metadata yet) */}
              <div className="h-[232px] w-full rounded-lg bg-[#d9d9d9]" />
            </div>
            {/* Right column */}
            <div className="flex flex-1 flex-col gap-4">
              {rightPosts.map((post) => (
                <FeedCard key={post.id} post={post} />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom nav */}
        <div className="fixed bottom-0 left-0 right-0 flex h-16 items-center justify-center border-t border-[#d9d9d9] bg-white shadow-[0px_-2px_4px_0px_rgba(0,0,0,0.12)]">
          <div className="flex w-[291px] items-center justify-between">
            {(
              [
                { id: "home", label: "Home", href: "/", Icon: HomeIcon },
                { id: "create", label: "Create", href: "/upload", Icon: PlusSquareIcon },
                { id: "profile", label: "Profile", href: "/profile", Icon: UserIcon },
              ] as { id: NavItem; label: string; href: string; Icon: ComponentType<{ className?: string }> }[]
            ).map(({ id, label, href, Icon }) => (
              <Link
                key={id}
                href={href}
                onClick={() => setActiveNav(id)}
                className="flex w-[37px] flex-col items-center"
              >
                <Icon
                  className={`size-6 ${
                    activeNav === id ? "text-[#fa6460]" : "text-[#2c2c2c]"
                  }`}
                />
                <span
                  className={`text-[11px] leading-[1.5] ${
                    activeNav === id ? "text-[#fa6460]" : "text-[#2c2c2c]"
                  }`}
                >
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </div>
    </div>
  );
}
