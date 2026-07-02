"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { processAndUploadMultipleAuras, type AuraMetadata, type UploadProgress, type UploadResult } from "@/services/uploadService";
import { getToken } from "@/lib/auth";
import { API_BASE } from "@/lib/api";
import BottomNav from "@/components/BottomNav";
interface NearbyPost { id: string; title: string; distance_meters: number; }

const MAX_TAGS = 5;

const ALL_TAGS = [
  "Downtown", "Neighborhoods", "Alleyways", "Courtyards",
  "LocalMarkets", "NightMarkets", "StreetArt", "Bridges",
  "Waterfront", "Rooftops & Skylines", "Architecture",
  "Mountains", "Forests", "Deserts", "Waterfalls", "Lakes", "Caves",
  "Beaches", "Islands", "Canyons", "Parks & Gardens", "Countryside",
  "Cafes", "Speakeasies", "Bookshops", "Libraries", "Boutiques",
  "Museums", "Galleries", "Hotels & Stays", "HistoricSites", "PopCulture",
  "StreetFood", "FineDining", "LiveMusic", "JazzBars", "LocalEats",
  "Hiking", "Cycling", "RoadTrip", "Camping", "WaterSports",
  "GoldenHour", "BlueHour", "Sunrise", "Sunset", "Stargazing",
  "Cinematic", "Cozy", "Vibrant", "Quiet", "Bustling", "Vintage",
  "Romantic", "Moody",
];

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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [gpsWarning, setGpsWarning] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [nearbyPosts, setNearbyPosts] = useState<NearbyPost[]>([]);
  const [showNearbyPrompt, setShowNearbyPrompt] = useState(false);

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

  const doUpload = async (parentId?: string | null) => {
    setError(null);
    setGpsWarning(null);
    setIsUploading(true);
    setUploadProgress(null);
    try {
      const gpsPhoto = photos[gpsPhotoIndex];
      const allFiles = photos.map(p => p.file);
      const metadata: AuraMetadata = {
        title: title.trim(),
        description: description.trim() || undefined,
        parent_id: parentId ?? null,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      };
      const result: UploadResult = await processAndUploadMultipleAuras(
        allFiles, gpsPhoto.file, metadata,
        (progress) => setUploadProgress(progress)
      );
      if (!result.hasGPS) {
        setGpsWarning("⚠️ No location data found in photos. Upload completed as unverified.");
        setTimeout(() => { setGpsWarning(null); router.push('/'); }, 3000);
      } else {
        router.push('/');
      }
    } catch (err: unknown) {
      const msg = (err as Error).message || "Upload failed";
      if (msg.includes("Invalid or expired token") || msg.includes("401") || msg.includes("Unauthorized")) {
        router.push("/login");
        return;
      }
      setError(msg.includes("MAX_WRITE_OPERATIONS_PER_HOUR")
        ? "Rate limit exceeded. Please try again later."
        : msg);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleUpload = async () => {
    if (photos.length === 0) { setError("Please select at least one photo"); return; }
    if (!title.trim()) { setError("Please enter a title"); return; }

    // Check for nearby posts before uploading
    try {
      const { default: exifr } = await import("exifr");
      const exifData = await exifr.parse(photos[gpsPhotoIndex].file, { gps: true });
      if (exifData?.latitude && exifData?.longitude) {
        const token = getToken();
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(
          `${API_BASE}/api/auras/check-nearby?lat=${exifData.latitude}&lng=${exifData.longitude}`,
          { headers }
        );
        if (res.ok) {
          const data = await res.json();
          const nearby: NearbyPost[] = data.nearby ?? [];
          if (nearby.length > 0) {
            setNearbyPosts(nearby);
            setShowNearbyPrompt(true);
            return; // Pause — wait for user to confirm in the prompt
          }
        }
      }
    } catch { /* no GPS or check-nearby not available — proceed normally */ }

    await doUpload();
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-white">
      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto pb-24">
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
                  <svg className="size-[37px] text-[#b7b7b7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
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
                      <svg className="size-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
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
              className="w-full rounded-[8px] border border-[#d9d9d9] px-3 py-[10px] text-[16px] text-[#1e1e1e] outline-none placeholder:text-[#b7b7b7] focus:border-[#aaa]"
            />
          </div>

          {/* Description */}
          <div className="mt-3 px-3">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description(Optional)"
              rows={5}
              className="w-full resize-none rounded-[8px] border border-[#d9d9d9] px-3 py-[10px] text-[16px] text-[#1e1e1e] outline-none placeholder:text-[#b7b7b7] focus:border-[#aaa]"
            />
          </div>

          {/* Tags */}
          <div className="mt-5 px-3">
            <div className="flex items-center justify-between">
              <p className="text-[16px] font-medium text-black">Tags</p>
              <p className="text-[12px] text-[#9a9a9a]">{selectedTags.length}/{MAX_TAGS}</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {ALL_TAGS.map((tag) => {
                const selected = selectedTags.includes(tag);
                const disabled = !selected && selectedTags.length >= MAX_TAGS;
                return (
                  <button
                    key={tag}
                    disabled={disabled}
                    onClick={() =>
                      setSelectedTags((prev) =>
                        selected ? prev.filter((t) => t !== tag) : [...prev, tag]
                      )
                    }
                    className={`flex items-center gap-1 rounded-[6px] px-[10px] py-[4px] text-[12px] transition-colors ${
                      selected
                        ? "bg-[#fff1c2] text-[#595959]"
                        : disabled
                        ? "border border-[#eee] text-[#ccc]"
                        : "border border-[#eee] text-[#7a7a7a]"
                    }`}
                  >
                    <svg className="size-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                      <line x1="7" y1="7" x2="7.01" y2="7" />
                    </svg>
                    {tag}
                  </button>
                );
              })}
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

      <BottomNav />

      {/* Nearby post prompt */}
      {showNearbyPrompt && nearbyPosts.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="w-full rounded-t-2xl bg-white px-5 pb-10 pt-5">
            <div className="mb-4 h-1 w-10 rounded-full bg-[#d9d9d9] mx-auto" />
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#fa6460]">📍 You&apos;re nearby</p>
            <h2 className="mt-2 text-[20px] font-bold text-[#1e1e1e]">
              "{nearbyPosts[0].title}" is {Math.round(nearbyPosts[0].distance_meters)}m away
            </h2>
            <p className="mt-1 text-[14px] text-[#757575]">
              Add your photo as a Perspective of this spot, or start a new Anchor.
            </p>
            <button
              onClick={async () => { setShowNearbyPrompt(false); await doUpload(nearbyPosts[0].id); }}
              className="mt-5 w-full rounded-[40px] bg-[#101827] py-[13px] text-[17px] font-medium text-white"
            >
              Add as Perspective
            </button>
            <button
              onClick={async () => { setShowNearbyPrompt(false); await doUpload(null); }}
              className="mt-3 w-full rounded-[40px] border border-[#e0e0e0] py-[13px] text-[17px] font-medium text-[#1e1e1e]"
            >
              No, new Anchor
            </button>
            <button
              onClick={() => setShowNearbyPrompt(false)}
              className="mt-2 w-full py-2 text-[14px] text-[#999]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
