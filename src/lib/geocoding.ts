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
    context?: {
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
 * Get city name from coordinates using Mapbox Search API
 */
export async function getCityFromCoordinates(
  lat: number,
  lng: number
): Promise<string> {
  const token = await getMapboxToken();
  if (!token) {
    console.warn("Mapbox token not configured");
    return "Unknown Location";
  }

  try {
    const url = `https://api.mapbox.com/search/searchbox/v1/reverse?longitude=${lng}&latitude=${lat}&access_token=${token}&types=place`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status}`);
    }

    const data: MapboxSearchResponse = await response.json();

    if (data.features && data.features.length > 0) {
      return data.features[0].properties.name || "Secret Spot";
    }

    return "Unknown Location";
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
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&types=place,locality,neighborhood&limit=5`;
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
