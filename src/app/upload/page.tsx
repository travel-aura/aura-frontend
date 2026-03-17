"use client";

import { type ComponentType, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { processAndUploadMultipleAuras, type AuraMetadata, type UploadProgress, type UploadResult } from "@/services/uploadService";
import type { Archetype } from "../../../shared/aura-schema";

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

const CATEGORIES: readonly Archetype[] = ["The Angle", "The Path", "The Spot", "The Interior"];

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

interface PhotoFile {
  file: File;
  preview: string;
}

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [gpsPhotoIndex, setGpsPhotoIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<Archetype>("The Path");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [gpsWarning, setGpsWarning] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const MAX_PHOTOS = 3;
    const newPhotos: PhotoFile[] = [];

    // Only take first 3 photos
    for (let i = 0; i < files.length && i < MAX_PHOTOS; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        newPhotos.push({
          file,
          preview: URL.createObjectURL(file),
        });
      }
    }

    // Show warning if user selected more than 3
    if (files.length > MAX_PHOTOS) {
      setError(`Maximum ${MAX_PHOTOS} photos allowed. First ${MAX_PHOTOS} selected.`);
      setTimeout(() => setError(null), 4000);
    } else {
      setError(null);
    }

    setPhotos(newPhotos);

    // Reset file input
    event.target.value = '';
  };

  const removePhoto = (index: number) => {
    const next = photos.filter((_, i) => i !== index);
    setPhotos(next);
    if (gpsPhotoIndex >= next.length) setGpsPhotoIndex(Math.max(0, next.length - 1));
    else if (gpsPhotoIndex === index) setGpsPhotoIndex(0);
  };

  const handleUpload = async () => {
    if (photos.length === 0) {
      setError("Please select at least one photo");
      return;
    }
    if (!title.trim()) {
      setError("Please enter a title");
      return;
    }

    setError(null);
    setGpsWarning(null);
    setIsUploading(true);
    setUploadProgress(null);

    try {
      const gpsPhoto = photos[gpsPhotoIndex];
      const allFiles = photos.map(p => p.file);

      const metadata: AuraMetadata = {
        title: title.trim(),
        archetype_tag: activeCategory,
        description: description.trim() || undefined,
      };

      const result: UploadResult = await processAndUploadMultipleAuras(
        allFiles,
        gpsPhoto.file,
        metadata,
        (progress) => setUploadProgress(progress)
      );

      // Show warning if no GPS data was found
      if (!result.hasGPS) {
        setGpsWarning("⚠️ No location data found in photos. Upload completed as unverified.");
        // Auto-dismiss warning after 3 seconds and redirect
        setTimeout(() => {
          setGpsWarning(null);
          router.push('/');
        }, 3000);
      } else {
        // Success with GPS! Redirect immediately
        router.push('/');
      }
    } catch (err: unknown) {
      setError((err as Error).message || "Upload failed");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-white">
      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto pb-safe">
          {/* Hidden file input - always present for ref */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          <h1 className="px-3 pt-3 text-[24px] font-semibold text-[#1e1e1e]">
            Upload
          </h1>

          {/* ── State 1: empty photo picker ── */}
          {photos.length === 0 && (
            <button
                onClick={() => fileInputRef.current?.click()}
                className="mx-3 mt-4 flex items-center gap-5"
              >
                <div className="flex h-[122px] w-[98px] shrink-0 items-center justify-center rounded-[10px] border border-[#e6e6e6] bg-gradient-to-b from-[#f6fafb] to-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ASSETS.imageIcon} alt="" className="size-[37px]" />
                </div>
                <p className="text-left text-[12px] leading-[1.5] text-[#717171]">
                  Select photos
                  <br />
                  (max 3 photos)
                </p>
              </button>
          )}

          {/* ── State 2: photos selected ── */}
          {photos.length > 0 && (
            <>
              {/* GPS photo selector hint */}
              <div className="flex items-center justify-between px-3 pt-1">
                <p className="text-[12px] text-[#2080ac]">
                  {photos.length > 1
                    ? `Select one photo for GPS data (applied to all ${photos.length} photos)`
                    : "GPS / Altitude / Heading from this photo"}
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[12px] text-[#fa6460] underline"
                >
                  Change
                </button>
              </div>

              {/* Horizontal photo strip */}
              <div className="mt-2 flex gap-2 overflow-x-auto px-3 pb-1">
                {photos.map((photo, i) => (
                  <div
                    key={i}
                    className={`relative h-[120px] w-[90px] shrink-0 overflow-hidden rounded-[12px] bg-[#d9d9d9] ${gpsPhotoIndex === i ? "ring-2 ring-[#abd2f4]" : ""}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.preview}
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
</>
          )}

          {/* Title */}
          <div className="mt-5 px-3">
            <input
              type="text"
              value={title}
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

          {/* Error message */}
          {error && (
            <div className="mx-3 mt-4 rounded-lg bg-red-50 px-4 py-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* GPS warning */}
          {gpsWarning && (
            <div className="mx-3 mt-4 rounded-lg bg-yellow-50 px-4 py-3 border border-yellow-200">
              <p className="text-sm text-yellow-800">{gpsWarning}</p>
            </div>
          )}

          {/* Upload progress */}
          {uploadProgress && (
            <div className="mx-3 mt-4 rounded-lg bg-blue-50 px-4 py-3">
              <p className="text-sm font-medium text-blue-900">
                Uploading photo {uploadProgress.current} of {uploadProgress.total}
              </p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-blue-200">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-blue-700 capitalize">
                {uploadProgress.status}...
              </p>
            </div>
          )}

          {/* Upload button */}
          <div className="mb-6 mt-8 px-3">
            <button
              onClick={handleUpload}
              disabled={isUploading || photos.length === 0}
              className="w-full rounded-[40px] bg-[#101827] py-[13px] text-[20px] font-medium text-white transition-opacity disabled:opacity-50"
            >
              {isUploading
                ? "Uploading..."
                : photos.length > 1
                  ? `Upload ${photos.length} Photos`
                  : "Upload"}
            </button>
          </div>
        </div>

      <BottomNav active="create" />
    </div>
  );
}
