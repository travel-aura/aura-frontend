/**
 * Reverse geocoding using Mapbox Search API
 * Converts lat/lng coordinates to city name
 */

let cachedToken: string | null = null;

async function getMapboxToken(): Promise<string> {
  if (cachedToken) return cachedToken;

  if (typeof window !== "undefined" && (window as { __MAPBOX_TOKEN__?: string }).__MAPBOX_TOKEN__) {
    cachedToken = (window as { __MAPBOX_TOKEN__?: string }).__MAPBOX_TOKEN__!;
    return cachedToken;
  }

  // Fallback: fetch from server API route (works even when static pages pre-rendered without the env var)
  try {
    const res = await fetch("/api/mapbox-token");
    const data = await res.json();
    if (data.token) {
      cachedToken = data.token;
      return data.token as string;
    }
  } catch {
    // ignore
  }

  return "";
}

interface MapboxSearchFeature {
  properties: {
    name: string;
    feature_type?: string;
    context?: {
      neighborhood?: { name: string };
      locality?: { name: string };
      place?: { name: string };
      region?: { name: string };
      country?: { name: string };
    };
  };
}

interface MapboxSearchResponse {
  features: MapboxSearchFeature[];
}

/**
 * Get a rich location label from coordinates.
 * Returns "Neighborhood, City" when available, otherwise "City" or "City, Country".
 */
export async function getCityFromCoordinates(
  lat: number,
  lng: number
): Promise<string> {
  const token = await getMapboxToken();
  if (!token) return "Unknown Location";

  try {
    // Request neighborhood + locality + place so we get the most specific result first
    const url = `https://api.mapbox.com/search/searchbox/v1/reverse?longitude=${lng}&latitude=${lat}&access_token=${token}&types=neighborhood,locality,place`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${response.status}`);

    const data: MapboxSearchResponse = await response.json();
    if (!data.features?.length) return "Unknown Location";

    const feat = data.features[0];
    const name = feat.properties.name;
    const ctx = feat.properties.context;

    // Build "SubArea, City" when the top result is a neighborhood/locality
    const city = ctx?.place?.name ?? ctx?.locality?.name;
    if (city && city !== name) return `${name}, ${city}`;

    // Just city name
    return name || "Unknown Location";
  } catch {
    return `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
  }
}

/**
 * Search for places by query string using Mapbox Geocoding API
 */
export async function searchPlaces(query: string): Promise<Array<{ name: string; lat: number; lng: number }>> {
  const token = await getMapboxToken();
  if (!token) return [];

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&types=country,region,place,locality,neighborhood&limit=5`;
    const response = await fetch(url);

    if (!response.ok) return [];

    const data = await response.json();
    return (data.features ?? []).map((f: { place_name: string; center: [number, number] }) => ({
      name: f.place_name,
      lat: f.center[1],
      lng: f.center[0],
    }));
  } catch {
    return [];
  }
}
