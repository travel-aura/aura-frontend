"use client";

import { useRouter } from "next/navigation";
import { t, type Language } from "@/lib/i18n";
import type { ArchetypeStats, CityEntry } from "../../shared/aura-schema";

// Older backends only send city names; show them without a country.
export function toCityEntries(stats?: Partial<ArchetypeStats> | null): CityEntry[] {
  if (stats?.city_list) return stats.city_list;
  return (stats?.cities ?? []).map((city) => ({ city, country_code: null, post_count: 0 }));
}

// Country code → localized country name ("pt" → "Portugal" / "葡萄牙")
function countryName(code: string | null, language: Language): string | null {
  if (!code) return null;
  try {
    const locale = language === "zh-CN" ? "zh-Hans" : language === "zh-TW" ? "zh-Hant" : "en";
    return new Intl.DisplayNames([locale], { type: "region" }).of(code.toUpperCase()) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

// Country code → flag emoji ("pt" → 🇵🇹)
function flag(code: string | null): string {
  if (!code || code.length !== 2) return "📍";
  return String.fromCodePoint(...code.toUpperCase().split("").map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

interface Props {
  cities: CityEntry[];
  language: Language;
  emptyText: string;
}

/** A profile's cities, grouped by country (most cities first). Tapping a city opens it on the home feed. */
export default function CityList({ cities, language, emptyText }: Props) {
  const router = useRouter();

  if (cities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <span className="text-[40px]">🗺️</span>
        <p className="mt-4 text-[17px] font-semibold text-[#1A1613]">{t("noCitiesYet", language)}</p>
        <p className="mt-1 text-[14px] text-[#6B5F52]">{emptyText}</p>
      </div>
    );
  }

  const groups = new Map<string, CityEntry[]>();
  for (const c of cities) {
    const key = c.country_code ?? "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }
  const ordered = [...groups.entries()]
    .map(([code, list]) => ({
      code: code || null,
      name: countryName(code || null, language) ?? t("otherPlaces", language),
      list: [...list].sort((a, b) => b.post_count - a.post_count || a.city.localeCompare(b.city)),
    }))
    // Countries with the most cities first; "Other" (unknown country) last
    .sort((a, b) => (a.code ? 0 : 1) - (b.code ? 0 : 1) || b.list.length - a.list.length || a.name.localeCompare(b.name));

  return (
    <div className="mt-2 flex flex-col gap-6">
      {ordered.map((g) => (
        <section key={g.code ?? "other"}>
          <h2 className="mb-2 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-[#6B5F52]">
            <span className="text-[16px] normal-case">{flag(g.code)}</span>
            {g.name}
            <span className="font-medium text-[#A09080]">· {g.list.length}</span>
          </h2>
          <ul className="flex flex-col gap-2">
            {g.list.map((c) => (
              <li key={`${c.city}|${c.country_code ?? ""}`}>
                <button
                  onClick={() => {
                    const country = countryName(c.country_code, "en");
                    router.push(`/?city=${encodeURIComponent(c.city)}${country ? `&country=${encodeURIComponent(country)}` : ""}`);
                  }}
                  className="flex w-full items-center gap-4 rounded-2xl bg-[#EDE6D9] px-4 py-3.5 text-left"
                >
                  <p className="min-w-0 flex-1 truncate text-[16px] font-semibold text-[#1A1613]">{c.city}</p>
                  <span className="shrink-0 text-[13px] text-[#6B5F52]">
                    {c.post_count} {t(c.post_count === 1 ? "postCountOne" : "postsCount", language)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
