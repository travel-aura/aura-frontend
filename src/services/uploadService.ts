import exifr from 'exifr';
import imageCompression from 'browser-image-compression';
import { API_BASE } from '@/lib/api';
import { getToken } from '@/lib/auth';
import type { AuraUploadMetadata, Archetype } from '../../shared/aura-schema';

export interface AuraMetadata {
  title: string;
  archetype_tag?: Archetype;
  description?: string;
  place_id?: string | null;    // existing generic Place to join; omit → backend creates one
  venue_id?: string | null;    // Mapbox POI feature ID → backend matches/creates Place by this
  parent_id?: string | null;   // legacy — kept for backward compat
  tags?: string[];
  place_name?: string;         // venue display name chosen by user
  lat?: number;                // manual location (no-GPS photos) — is_verified stays false
  lng?: number;
}

export interface UploadProgress {
  current: number;
  total: number;
  status: 'extracting' | 'optimizing' | 'uploading' | 'complete';
}

export interface UploadResult {
  data: unknown;
  hasGPS: boolean;
}

export type ProgressCallback = (progress: UploadProgress) => void;

/**
 * Upload multiple photos with shared GPS + EXIF data from an anchor photo.
 * Sends all images in a single request for carousel/gallery structure.
 */
export const processAndUploadMultipleAuras = async (
  files: File[],
  gpsAnchorFile: File,
  userMetadata: AuraMetadata,
  onProgress?: ProgressCallback
): Promise<UploadResult> => {
  // --- STEP 1: EXTRACT EXIF FROM ANCHOR PHOTO ---
  onProgress?.({ current: 0, total: files.length, status: 'extracting' });

  // Parse all available EXIF blocks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let exifData: Record<string, any> | null = null;
  try {
    exifData = await exifr.parse(gpsAnchorFile, {
      gps: true,   // computes latitude, longitude, altitude from raw GPS tags
      exif: true,  // DateTimeOriginal, OffsetTimeOriginal, DateTimeDigitized, etc.
      tiff: true,  // ModifyDate (DateTime), Orientation, etc.
    }) ?? null;
  } catch {
    // EXIF extraction failing is not fatal — continue without metadata
  }

  // GPS fields
  let isVerified = false;
  const gpsFields: Pick<AuraUploadMetadata, 'lat' | 'lng' | 'altitude' | 'heading'> = {};

  if (exifData?.latitude && exifData?.longitude) {
    isVerified = true;
    gpsFields.lat = exifData.latitude;
    gpsFields.lng = exifData.longitude;
    gpsFields.altitude = exifData.altitude ?? 0;
    gpsFields.heading = exifData.GPSImgDirection ?? 0;
  } else if (userMetadata.lat && userMetadata.lng) {
    // Manual location provided by user — not EXIF verified, is_verified stays false
    gpsFields.lat = userMetadata.lat;
    gpsFields.lng = userMetadata.lng;
  }

  // Extended date/time + GPS metadata
  const exifExtras: Partial<Pick<
    AuraUploadMetadata,
    'taken_at' | 'tz_offset' | 'gps_accuracy' | 'gps_timestamp'
  >> = {};

  // Serialize a Date from EXIF as a naive local string (no Z) so wall-clock
  // time is preserved regardless of the viewer's browser timezone.
  const naiveIso = (d: Date) => {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  };

  if (exifData?.DateTimeOriginal instanceof Date) {
    exifExtras.taken_at = naiveIso(exifData.DateTimeOriginal);
  }
  const tzOffset = exifData?.OffsetTimeOriginal ?? exifData?.OffsetTime ?? exifData?.OffsetTimeDigitized;
  if (tzOffset && typeof tzOffset === 'string') {
    exifExtras.tz_offset = tzOffset;
  }
  // GPS accuracy: prefer explicit horizontal error, fall back to DOP
  const gpsAccuracy = exifData?.GPSHPositioningError ?? exifData?.GPSDOP;
  if (typeof gpsAccuracy === 'number') {
    exifExtras.gps_accuracy = gpsAccuracy;
  }

  // GPS UTC timestamp: exifr exposes as a Date when gps:true, or as an array
  const gpsTs = exifData?.GPSTimeStamp;
  if (gpsTs instanceof Date) {
    exifExtras.gps_timestamp = gpsTs.toISOString();
  } else if (exifData?.GPSDateStamp && Array.isArray(gpsTs) && gpsTs.length === 3) {
    try {
      const d = String(exifData.GPSDateStamp).replace(/:/g, '-');
      const [h, m, s] = gpsTs as number[];
      const hh = String(Math.floor(h)).padStart(2, '0');
      const mm = String(Math.floor(m)).padStart(2, '0');
      const ss = String(Math.floor(s)).padStart(2, '0');
      exifExtras.gps_timestamp = `${d}T${hh}:${mm}:${ss}Z`;
    } catch { /* malformed GPS timestamp — skip */ }
  }

  // --- STEP 2: OPTIMIZE ALL PHOTOS ---
  const token = getToken();
  if (!token) throw new Error('Please log in first to upload photos');

  const compressionOptions = {
    maxSizeMB: 4,
    maxWidthOrHeight: 3840,
    initialQuality: 0.92,
    fileType: 'image/webp' as const,
  };

  const optimizedImages: Blob[] = [];
  for (let i = 0; i < files.length; i++) {
    onProgress?.({ current: i + 1, total: files.length, status: 'optimizing' });
    optimizedImages.push(await imageCompression(files[i], compressionOptions));
  }

  // --- STEP 3: BUILD FORMDATA ---
  onProgress?.({ current: files.length, total: files.length, status: 'uploading' });

  const formData = new FormData();
  optimizedImages.forEach((blob, i) => formData.append('images', blob, `aura_${i + 1}.webp`));

  const auraPayload: AuraUploadMetadata = {
    ...userMetadata,
    ...gpsFields,
    ...exifExtras,
    is_verified: isVerified,
  };
  formData.append('metadata', JSON.stringify(auraPayload));

  // --- STEP 4: SINGLE UPLOAD REQUEST ---
  const response = await fetch(`${API_BASE}/api/auras/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed: ${errorText}`);
  }

  const result = await response.json();
  onProgress?.({ current: files.length, total: files.length, status: 'complete' });

  return { data: result, hasGPS: isVerified };
};

/** Legacy single-photo upload — delegates to multi-photo uploader */
export const processAndUploadAura = async (file: File, userMetadata: AuraMetadata) =>
  processAndUploadMultipleAuras([file], file, userMetadata);
