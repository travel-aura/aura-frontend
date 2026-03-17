/**
 * SOURCE OF TRUTH: AURA DATA CONTRACT
 * Updated: 2026-03-17
 */

export type Archetype = 'The Angle' | 'The Path' | 'The Spot' | 'The Interior';

export interface Aura {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  image_urls: string[]; // Handled as text[] in Postgres
  archetype_tag: Archetype;
  lat: number | null;          // Decoded from geography(POINT) - NULL if no GPS
  lng: number | null;          // Decoded from geography(POINT) - NULL if no GPS
  heading: number;             // Default 0 if no GPS
  altitude: number;            // Default 0 if no GPS
  is_verified: boolean;        // false if no GPS data found
  created_at: string;
}

// What the Frontend sends to the POST endpoint
export interface AuraUploadPayload {
  metadata: {
    title: string;
    description?: string;
    archetype_tag: Archetype;
    // GPS fields - only present if EXIF data found
    lat?: number;
    lng?: number;
    heading?: number;
    alt?: number;
    is_verified: boolean;  // true if GPS exists, false otherwise
  };
  // Note: images are sent as FormData with field name 'images'
  // Not directly in this payload structure
}

// What the Frontend sends (FormData structure)
export interface AuraUploadMetadata {
  title: string;
  description?: string;
  archetype_tag: Archetype;
  lat?: number;          // Only if GPS data found in EXIF
  lng?: number;          // Only if GPS data found in EXIF
  heading?: number;      // Only if GPS data found in EXIF (default: 0)
  alt?: number;          // Only if GPS data found in EXIF (default: 0)
  is_verified: boolean;  // true if GPS exists, false if no GPS
}

// Backend RPC function parameters
export interface InsertAuraParams {
  p_user_id: string;
  p_title: string;
  p_image_urls: string[];          // Array of 1-3 URLs
  p_archetype_tag: Archetype;
  p_description?: string | null;
  p_lat?: number | null;           // NULL if no GPS
  p_lng?: number | null;           // NULL if no GPS
  p_alt?: number;                  // Default 0
  p_heading?: number;              // Default 0
  p_is_verified: boolean;          // false if no GPS
}
