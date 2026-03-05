"use client";

import { type ComponentType, useState } from "react";
import Link from "next/link";

// Figma asset URLs (expire in 7 days)
const ASSETS = {
  imageIcon:
    "https://www.figma.com/api/mcp/asset/611d27dc-b9b5-4146-bda0-d90c92fa69a8",
  imageIconSmall:
    "https://www.figma.com/api/mcp/asset/2532ec2f-efad-4e68-81b9-27d4929f781a",
  photo:
    "https://www.figma.com/api/mcp/asset/357d9b5a-bd30-40f7-adb4-e337eee5c36c",
  closeIcon:
    "https://www.figma.com/api/mcp/asset/cc491114-9e32-4b89-8a7f-51e70c69aedb",
};

const CATEGORIES = ["Angle", "Path", "Spot", "Interior"] as const;
type Category = (typeof CATEGORIES)[number];

// ── Icons ────────────────────────────────────────────────────────────────────

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

// ── Status Bar ────────────────────────────────────────────────────────────────

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

// ── Bottom Nav ────────────────────────────────────────────────────────────────

type NavItem = "home" | "create" | "profile";

const NAV_ITEMS: {
  id: NavItem;
  label: string;
  href: string;
  Icon: ComponentType<{ className?: string }>;
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

// ── Upload Page ───────────────────────────────────────────────────────────────

const MOCK_PHOTOS = [
  ASSETS.photo,
  ASSETS.photo,
  ASSETS.photo,
  ASSETS.photo,
  ASSETS.photo,
];

export default function UploadPage() {
  const [hasPhotos, setHasPhotos] = useState(false);
  const [photos, setPhotos] = useState<string[]>(MOCK_PHOTOS);
  const [gpsPhotoIndex, setGpsPhotoIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<Category>("Path");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const removePhoto = (index: number) => {
    const next = photos.filter((_, i) => i !== index);
    setPhotos(next);
    if (next.length === 0) setHasPhotos(false);
    else if (gpsPhotoIndex >= next.length) setGpsPhotoIndex(next.length - 1);
    else if (gpsPhotoIndex === index) setGpsPhotoIndex(0);
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-white">
      <StatusBar />

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto pb-safe">
          <h1 className="px-3 pt-3 text-[24px] font-semibold text-[#1e1e1e]">
            Upload
          </h1>

          {/* ── State 1: empty photo picker ── */}
          {!hasPhotos && (
            <button
              onClick={() => setHasPhotos(true)}
              className="mx-3 mt-4 flex items-center gap-5"
            >
              <div className="flex h-[122px] w-[98px] shrink-0 items-center justify-center rounded-[10px] border border-[#e6e6e6] bg-gradient-to-b from-[#f6fafb] to-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ASSETS.imageIcon} alt="" className="size-[37px]" />
              </div>
              <p className="text-left text-[12px] leading-[1.5] text-[#717171]">
                Select photos or videos
                <br />
                (single or multiple)
              </p>
            </button>
          )}

          {/* ── State 2: photos selected ── */}
          {hasPhotos && (
            <>
              {/* GPS photo selector hint */}
              <p className="px-3 pt-1 text-[12px] text-[#2080ac]">
                Select one photo for GPS / Altitude / Heading
              </p>

              {/* Horizontal photo strip */}
              <div className="mt-2 flex gap-2 overflow-x-auto px-3 pb-1">
                {photos.map((src, i) => (
                  <div
                    key={i}
                    className={`relative h-[120px] w-[90px] shrink-0 overflow-hidden rounded-[12px] bg-[#d9d9d9] ${gpsPhotoIndex === i ? "ring-2 ring-[#abd2f4]" : ""}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    {/* GPS selector — top-left */}
                    <button
                      onClick={() => setGpsPhotoIndex(i)}
                      className="absolute left-[5px] top-[5px] flex size-[16px] items-center justify-center rounded-full"
                    >
                      {gpsPhotoIndex === i ? (
                        /* Selected: blue ring + white dot */
                        <span className="flex size-[16px] items-center justify-center rounded-full bg-[#329af5]">
                          <span className="size-[8px] rounded-full bg-white" />
                        </span>
                      ) : (
                        /* Unselected: white/semi-transparent ring */
                        <span className="flex size-[16px] items-center justify-center rounded-full border border-[#d5d5d5] bg-white/80" />
                      )}
                    </button>
                    {/* Remove — top-right */}
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute right-[5px] top-[5px] flex size-[20px] items-center justify-center rounded-full bg-black/50"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={ASSETS.closeIcon}
                        alt="Remove"
                        className="size-3"
                      />
                    </button>
                  </div>
                ))}
              </div>

              {/* Upload more */}
              <button className="ml-3 mt-3 flex items-center gap-1.5 rounded-[8px] border border-[#e6e6e6] bg-gradient-to-b from-[#f6fafb] to-white px-3 py-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ASSETS.imageIconSmall} alt="" className="size-4" />
                <span className="text-[12px] text-[#717171]">
                  Upload photos
                </span>
              </button>
            </>
          )}

          {/* Title */}
          <div className="mt-5 px-3">
            <input
              type="text"
              value={hasPhotos ? "Yosemite National Park" : title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="w-full rounded-[8px] border border-[#d9d9d9] px-3 py-[10px] text-[15px] text-[#1e1e1e] outline-none placeholder:text-[#b7b7b7] focus:border-[#aaa]"
            />
          </div>

          {/* Description */}
          <div className="mt-3 px-3">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description(Optional)"
              rows={5}
              className="w-full resize-none rounded-[8px] border border-[#d9d9d9] px-3 py-[10px] text-[15px] text-[#1e1e1e] outline-none placeholder:text-[#b7b7b7] focus:border-[#aaa]"
            />
          </div>

          {/* Category */}
          <div className="mt-4 px-3">
            <p className="text-[16px] font-medium text-black">
              Choose a Category
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`rounded-full px-[10px] py-[4px] text-[12px] transition-colors ${
                    activeCategory === cat
                      ? "bg-black font-medium text-white"
                      : "border border-[#eee] font-normal text-[#7a7a7a]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Upload button */}
          <div className="mb-6 mt-8 px-3">
            <button className="w-full rounded-[40px] bg-[#101827] py-[13px] text-[20px] font-medium text-white">
              Upload
            </button>
          </div>
        </div>

      <BottomNav active="create" />
    </div>
  );
}
