"use client";

import { type ComponentType, useState } from "react";
import Link from "next/link";

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

function ImageEmptyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22.5 30H8.5C5.7 30 4.3 30 3.23 29.455A4 4 0 0 1 1.045 27.27C.5 26.2.5 24.8.5 22V10C.5 7.2.5 5.8 1.045 4.73A4 4 0 0 1 3.23 2.545C4.3 2 5.7 2 8.5 2H22.5C25.3 2 26.7 2 27.77 2.545A4 4 0 0 1 29.955 4.73C30.5 5.8 30.5 7.2 30.5 10V22C30.5 24.8 30.5 26.2 29.955 27.27A4 4 0 0 1 27.77 29.455C26.7 30 25.3 30 22.5 30Z" />
      <path d="M22.5 30C25.3 30 26.7 30 27.77 29.455A4 4 0 0 0 29.955 27.27C30.5 26.2 30.5 24.8 30.5 22V18M22.5 30H8.5C5.7 30 4.3 30 3.23 29.455A4 4 0 0 1 1.045 27.27C.5 26.2.5 24.8.5 22V18M22.5 18L16.5 12 4.109 25.552C4.038 25.628 4.003 25.666 3.804 25.8M22.5 18L30.5 10" />
      <circle cx="9.667" cy="9.167" r="3.333" />
    </svg>
  );
}

// ── Status Bar ─────────────────────────────────────────────────────────────────

function StatusBar() {
  return (
    <div className="relative flex h-[54px] items-end justify-between px-6 pb-2">
      <span className="text-[15px] font-semibold">9:41</span>
      <div className="absolute left-1/2 top-[14px] h-[34px] w-[126px] -translate-x-1/2 rounded-full bg-black" />
      <div className="flex items-center gap-1.5 text-black">
        <svg className="h-3 w-4" viewBox="0 0 20 14" fill="currentColor">
          <rect x="0" y="7" width="3" height="7" rx="1" />
          <rect x="4.5" y="4.5" width="3" height="9.5" rx="1" />
          <rect x="9" y="2" width="3" height="12" rx="1" />
          <rect x="13.5" y="0" width="3" height="14" rx="1" opacity="0.3" />
        </svg>
        <svg
          className="size-[14px]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
        >
          <path d="M1.5 8.5a14 14 0 0 1 21 0" />
          <path d="M5.5 12.5a9 9 0 0 1 13 0" />
          <path d="M9.5 16.5a4.5 4.5 0 0 1 5 0" />
          <circle cx="12" cy="20" r="1" fill="currentColor" />
        </svg>
        <svg
          className="h-[13px] w-[25px]"
          viewBox="0 0 25 13"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.2}
        >
          <rect x="0.6" y="0.6" width="21" height="11.8" rx="2.4" />
          <path d="M22.6 4v5" strokeWidth={2} strokeLinecap="round" />
          <rect x="2" y="2" width="17" height="9" rx="1.5" fill="currentColor" />
        </svg>
      </div>
    </div>
  );
}

// ── Bottom Nav ─────────────────────────────────────────────────────────────────

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

// ── Stats ──────────────────────────────────────────────────────────────────────

const STATS = [
  { value: "3", percentage: "30.00%", label: "Angle" },
  { value: "7", percentage: "70.00%", label: "Path" },
  { value: "3", percentage: "30.00%", label: "Spot" },
  { value: "0", percentage: "0.00%", label: "Interior" },
];

// ── Profile Page ───────────────────────────────────────────────────────────────

const TABS = ["Uploaded", "Saved"] as const;
type Tab = (typeof TABS)[number];

// Mock post data - in a real app, this would come from an API
type Post = {
  id: string;
  imageUrl: string;
  createdAt: Date;
};

// Example posts - modify count to test different layouts
const MOCK_UPLOADED_POSTS: Post[] = [
  {
    id: "1",
    imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128'%3E%3Crect width='128' height='128' fill='%23fa6460'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='white' text-anchor='middle' dominant-baseline='middle'%3EPost 1%3C/text%3E%3C/svg%3E",
    createdAt: new Date("2024-03-05"),
  },
  {
    id: "2",
    imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128'%3E%3Crect width='128' height='128' fill='%235a5a5a'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='white' text-anchor='middle' dominant-baseline='middle'%3EPost 2%3C/text%3E%3C/svg%3E",
    createdAt: new Date("2024-03-04"),
  },
  {
    id: "3",
    imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128'%3E%3Crect width='128' height='128' fill='%232c2c2c'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='white' text-anchor='middle' dominant-baseline='middle'%3EPost 3%3C/text%3E%3C/svg%3E",
    createdAt: new Date("2024-03-03"),
  },
  {
    id: "4",
    imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128'%3E%3Crect width='128' height='128' fill='%23757575'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='white' text-anchor='middle' dominant-baseline='middle'%3EPost 4%3C/text%3E%3C/svg%3E",
    createdAt: new Date("2024-03-02"),
  },
  {
    id: "5",
    imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128'%3E%3Crect width='128' height='128' fill='%23ededed'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='%231e1e1e' text-anchor='middle' dominant-baseline='middle'%3EPost 5%3C/text%3E%3C/svg%3E",
    createdAt: new Date("2024-03-01"),
  },
];

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<Tab>("Uploaded");

  // In a real app, these would be separate data sources
  const uploadedPosts = MOCK_UPLOADED_POSTS;
  const savedPosts: Post[] = [];

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-white">
      <StatusBar />

        {/* Logo */}
        <div className="flex justify-center pt-1">
          <span className="text-[20px] font-bold tracking-tight text-[#1e1e1e]">
            Aura
          </span>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Avatar */}
          <div className="mt-5 flex justify-center">
            <div className="size-[101px] overflow-hidden rounded-full border-2 border-white shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={AVATAR}
                alt="Profile avatar"
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          {/* Username */}
          <p className="mt-3 text-center text-[22px] font-bold text-[#1e1e1e]">
            INameame
          </p>

          {/* Stats row */}
          <div className="mx-4 mt-4 flex">
            {STATS.map((stat, i) => (
              <div key={i} className="flex flex-1">
                {/* Divider before all but the first */}
                {i > 0 && (
                  <div className="w-px self-stretch bg-[#d9d9d9]" />
                )}
                <div className="flex flex-1 flex-col items-center py-1">
                  <span className="text-[15px] font-semibold text-[#1e1e1e]">
                    {stat.label}
                  </span>
                  <span className="mt-1 text-[17px] font-bold text-[#1e1e1e]">
                    {stat.value}
                  </span>
                  <span className="text-[10px] leading-tight text-[#1e1e1e]">
                    {stat.percentage}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="mt-3 flex gap-4 px-4">
            <Link
              href="/profile/edit"
              className="flex-1 rounded-lg bg-[#ededed] py-[9px] text-center text-[13px] font-medium text-[#1e1e1e]"
            >
              Edit profile
            </Link>
            <button className="flex-1 rounded-lg bg-[#ededed] py-[9px] text-[13px] font-medium text-[#1e1e1e]">
              Share profile
            </button>
          </div>

          {/* Content tabs */}
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

          {/* Content area */}
          <div className="px-0.5 py-0.5">
            {activeTab === "Uploaded" && uploadedPosts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24">
                <ImageEmptyIcon className="size-[31px] text-black" />
                <p className="mt-5 text-[17px] font-semibold text-[#1e1e1e]">
                  No posts yet
                </p>
                <p className="mt-1 text-center text-[13px] leading-[1.5] text-[#757575]">
                  You haven&apos;t uploaded anything yet.
                </p>
              </div>
            )}

            {activeTab === "Uploaded" && uploadedPosts.length === 1 && (
              <div className="w-[128px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={uploadedPosts[0].imageUrl}
                  alt="Post"
                  className="aspect-square w-full object-cover"
                />
              </div>
            )}

            {activeTab === "Uploaded" && uploadedPosts.length > 1 && (
              <div className="grid grid-cols-3 gap-1">
                {uploadedPosts.map((post) => (
                  <div key={post.id} className="aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.imageUrl}
                      alt="Post"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}

            {activeTab === "Saved" && savedPosts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24">
                <ImageEmptyIcon className="size-[31px] text-black" />
                <p className="mt-5 text-[17px] font-semibold text-[#1e1e1e]">
                  No saved posts
                </p>
                <p className="mt-1 text-center text-[13px] leading-[1.5] text-[#757575]">
                  You haven&apos;t saved anything yet.
                </p>
              </div>
            )}

            {activeTab === "Saved" && savedPosts.length === 1 && (
              <div className="w-[128px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={savedPosts[0].imageUrl}
                  alt="Post"
                  className="aspect-square w-full object-cover"
                />
              </div>
            )}

            {activeTab === "Saved" && savedPosts.length > 1 && (
              <div className="grid grid-cols-3 gap-1">
                {savedPosts.map((post) => (
                  <div key={post.id} className="aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.imageUrl}
                      alt="Post"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      <BottomNav active="profile" />
    </div>
  );
}
