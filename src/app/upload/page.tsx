"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { type AuraMetadata } from "@/services/uploadService";
import { getToken } from "@/lib/auth";
import { API_BASE } from "@/lib/api";
import BottomNav from "@/components/BottomNav";
import { useLanguage } from "@/hooks/useLanguage";
import { TAG_GROUPS, translateTag, translateGroupLabel } from "@/lib/i18n";
import { useUpload } from "@/context/UploadContext";
import { searchNearbyPOIs, type NearbyPOI } from "@/lib/geocoding";

interface NearbyPlace {
  id: string;
  name: string;
  distance_meters: number;
  verified_count: number;
  cover_image_url?: string | null;
}

const MAX_TAGS = 5;

// ── Upload Page ───────────────────────────────────────────────────────────────

interface PhotoFile {
  file: File;
  preview: string;
}

function StoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
      <path d="M3 9l2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9" />
      <line x1="12" y1="3" x2="12" y2="9" />
    </svg>
  );
}

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { language } = useLanguage();
  const { startUpload } = useUpload();

  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login?from=upload");
    } else {
      setAuthed(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [gpsPhotoIndex, setGpsPhotoIndex] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [showNearbyPrompt, setShowNearbyPrompt] = useState(false);
  const [exifCoords, setExifCoords] = useState<{ lat: number; lng: number } | null>(null);
  // Venue (store/restaurant) — Step 1
  const [selectedVenueName, setSelectedVenueName] = useState<string | null>(null);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null); // Mapbox POI feature ID
  const [venueSkipped, setVenueSkipped] = useState(false); // user explicitly said "Not a venue"
  const [nearbyPOIs, setNearbyPOIs] = useState<NearbyPOI[]>([]);
  const [showPlacePicker, setShowPlacePicker] = useState(false);
  const [poisLoading, setPoisLoading] = useState(false);

  // Extract GPS from the anchor photo; reset venue selection when anchor changes
  useEffect(() => {
    if (photos.length === 0) {
      setExifCoords(null);
      setSelectedVenueName(null); setSelectedVenueId(null); setVenueSkipped(false);
      return;
    }
    const anchor = photos[gpsPhotoIndex];
    if (!anchor) return;
    // Reset venue choice whenever the GPS anchor changes
    setSelectedVenueName(null); setSelectedVenueId(null); setVenueSkipped(false);
    let cancelled = false;
    (async () => {
      try {
        const { default: exifr } = await import('exifr');
        const data = await exifr.parse(anchor.file, { gps: true });
        if (!cancelled) {
          if (data?.latitude && data?.longitude) {
            setExifCoords({ lat: data.latitude, lng: data.longitude });
          } else {
            setExifCoords(null);
          }
        }
      } catch {
        if (!cancelled) setExifCoords(null);
      }
    })();
    return () => { cancelled = true; };
  }, [photos, gpsPhotoIndex]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const doUpload = (placeId?: string | null) => {
    const gpsPhoto = photos[gpsPhotoIndex];
    const metadata: AuraMetadata = {
      title: title.trim(),
      description: description.trim() || undefined,
      // Venue path: send venue_id + place_name so backend matches/creates Place by Mapbox ID
      venue_id: selectedVenueId ?? undefined,
      place_name: selectedVenueName ?? undefined,
      // Generic spot path: send place_id of existing spot chosen from nearby prompt
      place_id: placeId ?? undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
    };
    startUpload(photos.map(p => p.file), gpsPhoto.file, metadata);
    router.push("/");
  };

  const handleUpload = async () => {
    if (photos.length === 0) { setError("Please select at least one photo"); return; }
    if (!title.trim()) { setError("Please enter a title"); return; }

    // Step 1 result: venue selected → backend handles Place via venue_id, skip nearby check
    if (selectedVenueId) {
      doUpload();
      return;
    }

    // Step 2: no venue — check for nearby generic spots
    try {
      const { default: exifr } = await import("exifr");
      const exifData = await exifr.parse(photos[gpsPhotoIndex].file, { gps: true });
      if (exifData?.latitude && exifData?.longitude) {
        const token = getToken();
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(
          `${API_BASE}/api/places/nearby?lat=${exifData.latitude}&lng=${exifData.longitude}`,
          { headers }
        );
        if (res.ok) {
          const data = await res.json();
          const nearby: NearbyPlace[] = data.places ?? [];
          if (nearby.length > 0) {
            setNearbyPlaces(nearby);
            setShowNearbyPrompt(true);
            return; // Pause — wait for user choice in the prompt
          }
        }
      }
    } catch { /* no GPS or places/nearby not yet available — proceed normally */ }

    doUpload();
  };

  const handleFindPlace = async () => {
    if (!exifCoords) return;
    setShowPlacePicker(true);
    setPoisLoading(true);
    try {
      const pois = await searchNearbyPOIs(exifCoords.lat, exifCoords.lng);
      setNearbyPOIs(pois);
    } catch {
      setNearbyPOIs([]);
    } finally {
      setPoisLoading(false);
    }
  };

  if (!authed) return null;

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-[#F7F3EC]">
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

          <h1 className="px-3 pt-3 text-[24px] font-semibold text-[#1A1613]">
            Upload
          </h1>

          {/* ── State 1: empty photo picker ── */}
          {photos.length === 0 && (
            <button
                onClick={() => fileInputRef.current?.click()}
                className="mx-3 mt-4 flex items-center gap-5"
              >
                <div className="flex h-[122px] w-[98px] shrink-0 items-center justify-center rounded-[10px] border border-[#D4C4A8] bg-gradient-to-b from-[#EDE6D9] to-[#F7F3EC]">
                  <svg className="size-[37px] text-[#A09080]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </div>
                <p className="text-left text-[12px] leading-[1.5] text-[#6B5F52]">
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
                <p className="text-[12px] text-[#6B5F52]">
                  {photos.length > 1
                    ? `Select one photo for GPS data (applied to all ${photos.length} photos)`
                    : "GPS / Altitude / Heading from this photo"}
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[12px] text-[#B85C38] underline"
                >
                  Change
                </button>
              </div>

              {/* Horizontal photo strip */}
              <div className="mt-2 flex gap-2 overflow-x-auto px-3 pb-1">
                {photos.map((photo, i) => (
                  <div
                    key={i}
                    className={`relative h-[120px] w-[90px] shrink-0 overflow-hidden rounded-[12px] bg-[#D4C4A8] ${gpsPhotoIndex === i ? "ring-2 ring-[#C9973A]" : ""}`}
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
                        <span className="flex size-[16px] items-center justify-center rounded-full bg-[#B85C38]">
                          <span className="size-[8px] rounded-full bg-[#F7F3EC]" />
                        </span>
                      ) : (
                        /* Unselected: white/semi-transparent ring */
                        <span className="flex size-[16px] items-center justify-center rounded-full border border-[#D4C4A8] bg-[#F7F3EC]/80" />
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
              className="w-full rounded-[8px] border border-[#D4C4A8] px-3 py-[10px] text-[16px] text-[#1A1613] outline-none placeholder:text-[#A09080] focus:border-[#B85C38]"
            />
          </div>

          {/* Description */}
          <div className="mt-3 px-3">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description(Optional)"
              rows={5}
              className="w-full resize-none rounded-[8px] border border-[#D4C4A8] px-3 py-[10px] text-[16px] text-[#1A1613] outline-none placeholder:text-[#A09080] focus:border-[#B85C38]"
            />
          </div>

          {/* Tags */}
          <div className="mt-5 px-3">
            <div className="flex items-center justify-between">
              <p className="text-[16px] font-medium text-black">Tags</p>
              <p className="text-[12px] text-[#A09080]">{selectedTags.length}/{MAX_TAGS}</p>
            </div>
            <div className="mt-3 space-y-4">
              {TAG_GROUPS.map((group) => (
                <div key={group.key}>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#A09080]">
                    {translateGroupLabel(group, language)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.tags.map((tag) => {
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
                              ? "bg-[#B85C38] text-white"
                              : disabled
                              ? "border border-[#D4C4A8] text-[#A09080]"
                              : "border border-[#D4C4A8] text-[#6B5F52]"
                          }`}
                        >
                          <svg className="size-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                            <line x1="7" y1="7" x2="7.01" y2="7" />
                          </svg>
                          {translateTag(tag, language)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step 1 — Venue question (shown when GPS available and not yet answered) */}
          {exifCoords && !venueSkipped && (
            <div className="mt-5 px-3">
              <div className="rounded-2xl border border-[#D4C4A8] bg-[#F9F6F0] px-4 py-4">
                <div className="flex items-start gap-3">
                  <span className="text-[20px] leading-none mt-0.5">🏪</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-[#1A1613]">
                      Is this at a restaurant, café, or store?
                    </p>
                    <p className="mt-0.5 text-[12px] text-[#6B5F52]">
                      We'll link your post to that venue
                    </p>
                  </div>
                </div>

                {selectedVenueName ? (
                  /* Venue selected — show name with Change button */
                  <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-[#EDE6D9] px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <StoreIcon className="size-4 shrink-0 text-[#6B5F52]" />
                      <span className="text-[14px] font-medium text-[#1A1613] truncate">{selectedVenueName}</span>
                    </div>
                    <button
                      onClick={() => { setSelectedVenueName(null); setSelectedVenueId(null); }}
                      className="shrink-0 text-[12px] text-[#A09080]"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  /* Not yet answered */
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={handleFindPlace}
                      className="flex-1 rounded-xl bg-[#1A1613] py-2.5 text-[13px] font-medium text-white"
                    >
                      Yes, find it
                    </button>
                    <button
                      onClick={() => setVenueSkipped(true)}
                      className="flex-1 rounded-xl border border-[#D4C4A8] py-2.5 text-[13px] font-medium text-[#6B5F52]"
                    >
                      Not a venue
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mx-3 mt-4 rounded-lg bg-red-50 px-4 py-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Upload button */}
          <div className="mb-6 mt-8 px-3">
            <button
              onClick={handleUpload}
              disabled={photos.length === 0}
              className="w-full rounded-[40px] bg-[#1A1613] py-[13px] text-[20px] font-medium text-white transition-opacity disabled:opacity-50"
            >
              {photos.length > 1 ? `Upload ${photos.length} Photos` : "Upload"}
            </button>
          </div>
        </div>

      <BottomNav />

      {/* Place picker sheet */}
      {showPlacePicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setShowPlacePicker(false)}>
          <div
            className="w-full rounded-t-2xl bg-[#F9F6F0] px-4 pt-5 pb-10 shadow-xl overflow-y-auto"
            style={{ maxHeight: '70vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 h-1 w-10 rounded-full bg-[#D4C4A8] mx-auto" />
            <p className="text-[16px] font-semibold text-[#1A1613]">Select a place</p>
            <p className="mt-0.5 mb-4 text-[12px] text-[#6B5F52]">Places near where this photo was taken</p>
            {poisLoading ? (
              <p className="py-8 text-center text-[14px] text-[#6B5F52]">Finding nearby places…</p>
            ) : nearbyPOIs.length === 0 ? (
              <p className="py-8 text-center text-[14px] text-[#6B5F52]">No places found nearby</p>
            ) : (
              <div className="space-y-2">
                {nearbyPOIs.map((poi) => (
                  <button
                    key={poi.id}
                    onClick={() => {
                      setSelectedVenueName(poi.name);
                      setSelectedVenueId(poi.id); // Mapbox feature ID → sent as venue_id to backend
                      setShowPlacePicker(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl bg-[#EDE6D9] px-4 py-3 text-left"
                  >
                    <StoreIcon className="size-5 shrink-0 text-[#6B5F52]" />
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-[#1A1613]">{poi.name}</p>
                      {poi.category && (
                        <p className="text-[12px] capitalize text-[#A09080]">{poi.category}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowPlacePicker(false)}
              className="mt-4 w-full py-2.5 text-[14px] text-[#6B5F52]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Nearby places prompt */}
      {showNearbyPrompt && nearbyPlaces.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setShowNearbyPrompt(false)}>
          <div
            className="w-full rounded-t-2xl bg-[#F9F6F0] px-4 pt-5 pb-10 shadow-xl overflow-y-auto"
            style={{ maxHeight: '80vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 h-1 w-10 rounded-full bg-[#D4C4A8] mx-auto" />
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#B85C38]">📍 Nearby spot</p>
            <h2 className="mt-1.5 text-[20px] font-bold text-[#1A1613]">Add to an existing spot?</h2>
            <p className="mt-1 mb-4 text-[14px] text-[#6B5F52]">
              These spots are nearby — add your shot to one, or create a new spot.
            </p>

            {/* List of nearby places */}
            <div className="space-y-2">
              {nearbyPlaces.map((place) => (
                <button
                  key={place.id}
                  onClick={() => { setShowNearbyPrompt(false); doUpload(place.id); }}
                  className="flex w-full items-center gap-3 rounded-2xl bg-[#EDE6D9] px-4 py-3 text-left"
                >
                  {/* Cover thumbnail */}
                  {place.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={place.cover_image_url}
                      alt={place.name}
                      className="size-14 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-[#D4C4A8]">
                      <svg className="size-6 text-[#6B5F52]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                        <circle cx="12" cy="9" r="2.5" />
                      </svg>
                    </div>
                  )}

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-[#1A1613] truncate">{place.name}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-[12px] text-[#6B5F52]">
                        {place.distance_meters < 1000
                          ? `${Math.round(place.distance_meters)}m away`
                          : `${(place.distance_meters / 1000).toFixed(1)}km away`}
                      </span>
                      {place.verified_count > 0 && (
                        <>
                          <span className="text-[#D4C4A8]">·</span>
                          <span className="text-[12px] text-[#6B5F52]">
                            {place.verified_count} verified {place.verified_count === 1 ? "shot" : "shots"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <svg className="size-4 shrink-0 text-[#A09080]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              ))}
            </div>

            {/* Create new spot */}
            <button
              onClick={() => { setShowNearbyPrompt(false); doUpload(null); }}
              className="mt-3 w-full rounded-2xl border border-[#D4C4A8] bg-[#F7F3EC] py-3.5 text-[15px] font-medium text-[#1A1613]"
            >
              Create new spot
            </button>
            <button
              onClick={() => setShowNearbyPrompt(false)}
              className="mt-2 w-full py-2.5 text-[13px] text-[#A09080]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
