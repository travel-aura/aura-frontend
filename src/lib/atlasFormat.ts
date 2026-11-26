import { t, type Language, type UITextKey } from "@/lib/i18n";

/** "1 city" / "3 cities", in the current language */
export function countText(n: number, one: UITextKey, many: UITextKey, lang: Language): string {
  return t(n === 1 ? one : many, lang).replace("{n}", n.toLocaleString());
}

/** 450 → "450 m", 1240 → "1.2 km" */
export function distanceText(meters: number, lang: Language): string {
  if (meters < 1000) return t("unitM", lang).replace("{n}", String(Math.max(10, Math.round(meters / 10) * 10)));
  const km = meters < 10000 ? Math.round(meters / 100) / 10 : Math.round(meters / 1000);
  return t("unitKm", lang).replace("{n}", String(km));
}

export function guideHref(userId: string, city: string, countryCode: string | null): string {
  const q = countryCode ? `?country=${encodeURIComponent(countryCode)}` : "";
  return `/profile/${userId}/guides/${encodeURIComponent(city)}${q}`;
}
