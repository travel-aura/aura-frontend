/**
 * Profile Atlas and city Guides: grouping a profile's posts by city and country,
 * turning a city's spots into a walking route, and building map links.
 * No imports, so it runs under plain Node for tests.
 */

export interface AtlasPost {
  id: string;
  title: string;
  image_urls: string[];
  lat: number;
  lng: number;
  created_at?: string;
  place_id?: string | null;
  place_name?: string | null;
  tags?: string[];
  city_name?: string | null;
  country_code?: string | null;
  location_hidden?: boolean;
}

export interface LatLng { lat: number; lng: number }

export interface CityGroup {
  key: string;
  city: string;
  countryCode: string | null;
  posts: AtlasPost[];
  /** Posts that may be shown on a map (exact location, valid coordinates) */
  mappable: AtlasPost[];
  center: LatLng | null;
}

export interface CountryGroup {
  countryCode: string;
  cityCount: number;
  postCount: number;
}

export interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  posts: AtlasPost[];
  /** Sunset, golden hour or night shots: these go at the end of a walk */
  evening: boolean;
}

export interface Guide {
  key: string;
  city: string;
  countryCode: string | null;
  stops: Stop[];
  postIds: string[];
  distanceM: number;
  coverUrl: string | null;
}

/** A city needs this many distinct spots to become a guide */
export const MIN_GUIDE_STOPS = 3;
/** Google Maps directions take an origin, a destination and up to 9 waypoints */
export const MAX_WALK_STOPS = 11;

const EVENING_TAGS = new Set(["sunset", "golden hour", "sunset spot", "twilight", "blue hour", "night"]);
const ACCENT = "b85c38";

// ── Basics ─────────────────────────────────────────────────────────────────────

export function isMappable(p: AtlasPost): boolean {
  if (p.location_hidden) return false;
  const { lat, lng } = p;
  if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

export function cityKey(city: string, countryCode: string | null | undefined): string {
  return `${(countryCode ?? "").toLowerCase()}|${city.trim().toLowerCase()}`;
}

export function distanceM(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function routeLengthM(points: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += distanceM(points[i - 1], points[i]);
  return total;
}

/** Rough walking time: straight-line distance plus 30% for streets, at 4.8 km/h */
export function walkingMinutes(straightLineM: number): number {
  return Math.round((straightLineM * 1.3) / 80);
}

function centroid(points: LatLng[]): LatLng | null {
  if (points.length === 0) return null;
  const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const lng = points.reduce((s, p) => s + p.lng, 0) / points.length;
  return { lat, lng };
}

// ── Grouping ───────────────────────────────────────────────────────────────────

/** Posts grouped by city, most posts first. Posts without a city are left out. */
export function groupCities(posts: AtlasPost[]): CityGroup[] {
  const groups = new Map<string, CityGroup>();
  for (const p of posts) {
    const city = p.city_name?.trim();
    if (!city) continue;
    const key = cityKey(city, p.country_code);
    let g = groups.get(key);
    if (!g) {
      g = { key, city, countryCode: p.country_code?.toLowerCase() ?? null, posts: [], mappable: [], center: null };
      groups.set(key, g);
    }
    g.posts.push(p);
    if (isMappable(p)) g.mappable.push(p);
  }
  const list = [...groups.values()];
  for (const g of list) g.center = centroid(g.mappable);
  return list.sort((a, b) => b.posts.length - a.posts.length || a.city.localeCompare(b.city));
}

/** One passport stamp per country, most posts first. Posts without a country are left out. */
export function groupCountries(posts: AtlasPost[]): CountryGroup[] {
  const byCountry = new Map<string, { cities: Set<string>; postCount: number }>();
  for (const p of posts) {
    const code = p.country_code?.toLowerCase();
    if (!code) continue;
    let c = byCountry.get(code);
    if (!c) { c = { cities: new Set(), postCount: 0 }; byCountry.set(code, c); }
    c.postCount++;
    if (p.city_name?.trim()) c.cities.add(p.city_name.trim().toLowerCase());
  }
  return [...byCountry.entries()]
    .map(([countryCode, c]) => ({ countryCode, cityCount: c.cities.size, postCount: c.postCount }))
    .sort((a, b) => b.postCount - a.postCount || a.countryCode.localeCompare(b.countryCode));
}

export function filterByCountry<T extends { country_code?: string | null }>(posts: T[], countryCode: string | null): T[] {
  if (!countryCode) return posts;
  return posts.filter((p) => p.country_code?.toLowerCase() === countryCode.toLowerCase());
}

// ── Guides ─────────────────────────────────────────────────────────────────────

/** Distinct spots from a city's posts. Several shots of one place become one stop. */
export function buildStops(posts: AtlasPost[]): Stop[] {
  const stops = new Map<string, Stop>();
  for (const p of posts) {
    if (!isMappable(p)) continue;
    const id = p.place_id || p.id;
    let s = stops.get(id);
    if (!s) {
      s = { id, name: (p.place_name || p.title || "").trim(), lat: p.lat, lng: p.lng, posts: [], evening: false };
      stops.set(id, s);
    }
    s.posts.push(p);
    if ((p.tags ?? []).some((tag) => EVENING_TAGS.has(tag.toLowerCase()))) s.evening = true;
  }
  return [...stops.values()];
}

/** Nearest-neighbour path from a fixed start */
function greedyFrom<T extends LatLng>(start: T, rest: T[]): T[] {
  const path = [start];
  const left = [...rest];
  let cur = start;
  while (left.length) {
    let best = 0;
    for (let i = 1; i < left.length; i++) {
      if (distanceM(cur, left[i]) < distanceM(cur, left[best])) best = i;
    }
    cur = left.splice(best, 1)[0];
    path.push(cur);
  }
  return path;
}

/** Shorten an open path by reversing segments (2-opt). `fixFirst` keeps path[0] in place. */
function twoOpt<T extends LatLng>(path: T[], fixFirst: boolean, before?: LatLng): T[] {
  const p = [...path];
  const len = (arr: T[]) => routeLengthM(before ? [before, ...arr] : arr);
  let improved = true;
  let guard = 0;
  while (improved && guard++ < 50) {
    improved = false;
    for (let i = fixFirst ? 1 : 0; i < p.length - 1; i++) {
      for (let j = i + 1; j < p.length; j++) {
        const next = [...p.slice(0, i), ...p.slice(i, j + 1).reverse(), ...p.slice(j + 1)];
        if (len(next) + 0.5 < len(p)) { p.splice(0, p.length, ...next); improved = true; }
      }
    }
  }
  return p;
}

/** Shortest of the greedy paths over every possible start, then 2-opt */
function bestOpenPath<T extends LatLng>(points: T[], after?: LatLng): T[] {
  if (points.length <= 1) return [...points];
  if (after) {
    const first = nearest(after, points);
    return twoOpt(greedyFrom(first, points.filter((p) => p !== first)), false, after);
  }
  let best: T[] = points;
  let bestLen = Infinity;
  for (const start of points) {
    const path = greedyFrom(start, points.filter((p) => p !== start));
    const l = routeLengthM(path);
    if (l < bestLen) { bestLen = l; best = path; }
  }
  return twoOpt(best, false);
}

function nearest<T extends LatLng>(from: LatLng, points: T[]): T {
  return points.reduce((a, b) => (distanceM(from, b) < distanceM(from, a) ? b : a));
}

/** Walking order: daytime spots first along a short path, then sunset/evening spots. */
export function orderRoute(stops: Stop[]): Stop[] {
  const day = stops.filter((s) => !s.evening);
  const evening = stops.filter((s) => s.evening);
  const dayPath = bestOpenPath(day);
  const eveningPath = bestOpenPath(evening, dayPath[dayPath.length - 1]);
  return [...dayPath, ...eveningPath];
}

/** Every city with at least MIN_GUIDE_STOPS spots becomes a guide, biggest first. */
export function buildGuides(posts: AtlasPost[], minStops = MIN_GUIDE_STOPS): Guide[] {
  const guides: Guide[] = [];
  for (const g of groupCities(posts)) {
    const stops = buildStops(g.mappable);
    if (stops.length < minStops) continue;
    const ordered = orderRoute(stops);
    guides.push({
      key: g.key,
      city: g.city,
      countryCode: g.countryCode,
      stops: ordered,
      postIds: ordered.flatMap((s) => s.posts.map((p) => p.id)),
      distanceM: routeLengthM(ordered),
      coverUrl: ordered[0]?.posts[0]?.image_urls?.[0] ?? null,
    });
  }
  return guides.sort((a, b) => b.stops.length - a.stops.length || a.city.localeCompare(b.city));
}

export function findGuide(posts: AtlasPost[], city: string, countryCode: string | null): Guide | null {
  const key = cityKey(city, countryCode);
  return buildGuides(posts).find((g) => g.key === key) ?? null;
}

// ── Common ground ──────────────────────────────────────────────────────────────

/** Cities both people have posted in. Matches on country too when both sides know it. */
export function commonCities<T extends { city: string; country_code: string | null }>(mine: T[], theirs: T[]): T[] {
  const norm = (s: string) => s.trim().toLowerCase();
  return theirs.filter((c) =>
    mine.some((m) => {
      if (norm(m.city) !== norm(c.city)) return false;
      if (m.country_code && c.country_code) return m.country_code.toLowerCase() === c.country_code.toLowerCase();
      return true;
    })
  );
}

// ── Links and maps ─────────────────────────────────────────────────────────────

const fmt = (n: number) => String(Math.round(n * 1e5) / 1e5);

/** Google Maps walking directions through the stops (first 11 only: Google's limit) */
export function googleMapsWalkUrl(stops: LatLng[]): { url: string; truncated: boolean } {
  const used = stops.slice(0, MAX_WALK_STOPS);
  const pt = (s: LatLng) => `${fmt(s.lat)},${fmt(s.lng)}`;
  const params = new URLSearchParams({ api: "1", travelmode: "walking" });
  if (used.length > 0) params.set("origin", pt(used[0]));
  if (used.length > 1) params.set("destination", pt(used[used.length - 1]));
  if (used.length > 2) params.set("waypoints", used.slice(1, -1).map(pt).join("|"));
  return { url: `https://www.google.com/maps/dir/?${params.toString()}`, truncated: stops.length > used.length };
}

/** Google's encoded polyline format (precision 5), used by Mapbox static path overlays */
export function encodePolyline(points: LatLng[]): string {
  let out = "";
  let prevLat = 0;
  let prevLng = 0;
  const enc = (v: number) => {
    let x = v < 0 ? ~(v << 1) : v << 1;
    let s = "";
    while (x >= 0x20) { s += String.fromCharCode((0x20 | (x & 0x1f)) + 63); x >>= 5; }
    return s + String.fromCharCode(x + 63);
  };
  for (const p of points) {
    const lat = Math.round(p.lat * 1e5);
    const lng = Math.round(p.lng * 1e5);
    out += enc(lat - prevLat) + enc(lng - prevLng);
    prevLat = lat;
    prevLng = lng;
  }
  return out;
}

interface MapOpts { token: string; width?: number; height?: number }

function staticUrl(overlays: string[], viewport: string, { token, width = 600, height = 300 }: MapOpts, padding?: number) {
  const pad = padding ? `&padding=${padding}` : "";
  return `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/${overlays.join(",")}/${viewport}/${width}x${height}@2x?access_token=${encodeURIComponent(token)}${pad}`;
}

function viewportFor(points: LatLng[], singleZoom: number): string {
  if (points.length === 1) return `${fmt(points[0].lng)},${fmt(points[0].lat)},${singleZoom},0`;
  return "auto";
}

/** Atlas map: one pin per city, sized and labelled by number of shots */
export function atlasMapUrl(cities: CityGroup[], opts: MapOpts): string | null {
  const pins = cities.filter((c) => c.center).slice(0, 50);
  if (pins.length === 0 || !opts.token) return null;
  const overlays = pins.map((c) => {
    const n = c.posts.length;
    const size = n >= 10 ? "l" : n >= 3 ? "m" : "s";
    const label = n > 1 ? `-${Math.min(n, 99)}` : "";
    return `pin-${size}${label}+${ACCENT}(${fmt(c.center!.lng)},${fmt(c.center!.lat)})`;
  });
  return staticUrl(overlays, viewportFor(pins.map((c) => c.center!), 9), opts, 40);
}

/** Guide map: numbered stops joined by the walking route */
export function guideMapUrl(stops: LatLng[], opts: MapOpts): string | null {
  if (stops.length === 0 || !opts.token) return null;
  const pins = stops.slice(0, 99).map((s, i) => `pin-s-${i + 1}+${ACCENT}(${fmt(s.lng)},${fmt(s.lat)})`);
  const path = stops.length > 1 ? [`path-3+${ACCENT}-0.7(${encodeURIComponent(encodePolyline(stops))})`] : [];
  return staticUrl([...path, ...pins], viewportFor(stops, 14), opts, 50);
}
