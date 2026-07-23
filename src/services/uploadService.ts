import exifr from 'exifr';
import imageCompression from 'browser-image-compression';
import { API_BASE } from '@/lib/api';
import { getToken } from '@/lib/auth';
import type { AuraUploadMetadata, Archetype } from '../../shared/aura-schema';

// Android OEMs sometimes return raw [deg, min, sec] arrays without computing decimal degrees,
// or write lowercase refs ('n'/'s'). This handles both cases.
function dmsToDecimal(dms: number[] | undefined, ref: string | undefined): number | null {
  if (!Array.isArray(dms) || dms.length < 2) return null;
  const [deg, min, sec = 0] = dms;
  if (typeof deg !== 'number' || typeof min !== 'number') return null;
  const decimal = Math.abs(deg) + Math.abs(min) / 60 + Math.abs(sec) / 3600;
  const dir = (ref ?? '').trim().toUpperCase();
  if (dir === 'S' || dir === 'W') return -decimal;
  if (dir === 'N' || dir === 'E') return decimal;
  // No ref present — return signed value if degrees are already signed
  return deg < 0 ? -decimal : decimal;
}

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
  exif_lat?: number;           // pre-extracted EXIF GPS from page scan — is_verified true
  exif_lng?: number;
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

  // Parse all available EXIF blocks.
  // xmp: true catches GPS stored in XMP segments on some Android OEMs (Xiaomi, OnePlus, Oppo).
  // Read the whole file into an ArrayBuffer first. exifr's chunked reader can see the
  // GPS tag but fail to resolve its value offset when it lands outside the loaded chunk
  // (returns [null,null,null] → NaN). The full buffer keeps all offsets in range.
  let anchorBuf: ArrayBuffer | File = gpsAnchorFile;
  try {
    anchorBuf = await gpsAnchorFile.arrayBuffer();
  } catch {
    // arrayBuffer unavailable — fall back to passing the File directly
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let exifData: Record<string, any> | null = null;
  try {
    exifData = await exifr.parse(anchorBuf, {
      gps: true,   // computes latitude, longitude, altitude from raw GPS tags
      exif: true,  // DateTimeOriginal, OffsetTimeOriginal, DateTimeDigitized, etc.
      tiff: true,  // ModifyDate (DateTime), Orientation, etc.
      xmp: true,   // Android OEMs sometimes store GPS only in XMP, not in GPS IFD
    }) ?? null;
  } catch {
    // EXIF extraction failing is not fatal — continue without metadata
  }

  // GPS fields
  let isVerified = false;
  const gpsFields: Pick<AuraUploadMetadata, 'lat' | 'lng' | 'altitude' | 'heading'> = {};

  // Some Android cameras write an empty GPS block when geotagging is off, and exifr
  // returns NaN for those — which slips past null checks and would send NaN downstream.
  // Coerce any non-finite value to null so empty GPS is treated as "no location".
  const fin = (n: unknown): number | null =>
    typeof n === 'number' && Number.isFinite(n) ? n : null;

  // exifr computes latitude/longitude when gps:true — prefer those.
  // Fallback: some Android devices return raw DMS arrays (GPSLatitude) without computing
  // the decimal degree value, or write lowercase ref strings ('n'/'s'/'e'/'w').
  let lat = fin(exifData?.latitude) ?? fin(dmsToDecimal(exifData?.GPSLatitude, exifData?.GPSLatitudeRef));
  let lng = fin(exifData?.longitude) ?? fin(dmsToDecimal(exifData?.GPSLongitude, exifData?.GPSLongitudeRef));

  // Third-pass fallback: exifr.gps() is a dedicated GPS extractor that handles XMP-only GPS
  // (common on Xiaomi/OnePlus/Oppo) and DMS string formats that neither path above catches.
  if (lat == null || lng == null || (lat === 0 && lng === 0)) {
    try {
      const gpsOnly = await exifr.gps(anchorBuf);
      const gLat = fin(gpsOnly?.latitude);
      const gLng = fin(gpsOnly?.longitude);
      if (gLat != null && gLng != null && (gLat !== 0 || gLng !== 0)) {
        lat = gLat;
        lng = gLng;
      }
    } catch {}
  }

  // Fourth-pass fallback: coords pre-extracted by the upload page scan.
  // The page scan runs the same exifr passes at selection time and stores results in exif_lat/exif_lng.
  // This ensures Android GPS is never silently lost when the service re-parse happens to fail.
  const exifLat = fin(userMetadata.exif_lat);
  const exifLng = fin(userMetadata.exif_lng);
  if ((lat == null || lng == null || (lat === 0 && lng === 0))
      && exifLat != null && exifLng != null
      && (exifLat !== 0 || exifLng !== 0)) {
    lat = exifLat;
    lng = exifLng;
  }

  if (lat != null && lng != null && (lat !== 0 || lng !== 0)) {
    isVerified = true;
    gpsFields.lat = lat;
    gpsFields.lng = lng;
    gpsFields.altitude = exifData?.altitude ?? exifData?.GPSAltitude ?? 0;
    gpsFields.heading = exifData?.GPSImgDirection ?? exifData?.GPSTrack ?? 0;
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
