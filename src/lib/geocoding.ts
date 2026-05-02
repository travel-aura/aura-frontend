/**
 * Reverse geocoding using Mapbox Search API
 * Converts lat/lng coordinates to city name
 */

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

interface MapboxSearchFeature {
  properties: {
    name: string;
    context?: {
      place?: {
        name: string;
      };
      region?: {
        name: string;
      };
      country?: {
        name: string;
      };
    };
  };
}

interface MapboxSearchResponse {
  features: MapboxSearchFeature[];
}

/**
 * Get city name from coordinates using Mapbox Search API
 * @param lat Latitude
 * @param lng Longitude
 * @returns City name (e.g., "San Francisco" or "Paris")
 */
export async function getCityFromCoordinates(
  lat: number,
  lng: number
): Promise<string> {
  if (!MAPBOX_TOKEN) {
    console.warn('Mapbox token not configured');
    return 'Unknown Location';
  }

  try {
    // Use Mapbox Search Box API reverse geocoding
    // Note: Mapbox uses longitude, latitude order
    const url = `https://api.mapbox.com/search/searchbox/v1/reverse?longitude=${lng}&latitude=${lat}&access_token=${MAPBOX_TOKEN}&types=place`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status}`);
    }

    const data: MapboxSearchResponse = await response.json();

    // Extract the city/place name from the GeoJSON features
    if (data.features && data.features.length > 0) {
      const place = data.features[0];
      return place.properties.name || "Secret Spot";
    }

    return "Unknown Location";
  } catch (error) {
    console.warn('Mapbox geocoding unavailable, using coordinates');
    // Return formatted coordinates as fallback
    return `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
  }
}
