"use client";

import { useEffect, useMemo, useState } from "react";
import { groupCities, groupCountries, filterByCountry, atlasMapUrl, type AtlasPost } from "@/lib/atlas";
import { countText } from "@/lib/atlasFormat";
import { countryName, flag } from "@/lib/places";
import { getMapboxToken } from "@/lib/geocoding";
import { t, type Language } from "@/lib/i18n";

interface Props {
  posts: AtlasPost[];
  language: Language;
  selectedCountry: string | null;
  onSelectCountry: (code: string | null) => void;
}

/** Map of where someone has shot, plus one passport stamp per country that filters the profile. */
export default function AtlasSection({ posts, language, selectedCountry, onSelectCountry }: Props) {
  const [token, setToken] = useState("");
  useEffect(() => { getMapboxToken().then(setToken).catch(() => {}); }, []);

  const allCities = useMemo(() => groupCities(posts), [posts]);
  const countries = useMemo(() => groupCountries(posts), [posts]);
  const mapCities = useMemo(
    () => groupCities(filterByCountry(posts, selectedCountry)),
    [posts, selectedCountry]
  );
  const mapUrl = useMemo(() => atlasMapUrl(mapCities, { token, width: 640, height: 280 }), [mapCities, token]);

  if (allCities.length === 0) return null;

  const shotCount = posts.filter((p) => p.city_name).length;

  return (
    <section className="mt-4 px-4" aria-label={t("atlasTitle", language)}>
      <div className="flex items-baseline justify-between">
        <h2 className="text-[15px] font-bold text-[#1A1613]">{t("atlasTitle", language)}</h2>
        <p className="text-[12px] text-[#6B5F52]">
          {countText(allCities.length, "nCity", "nCities", language)} · {countText(countries.length, "nCountry", "nCountries", language)} · {countText(shotCount, "nShot", "nShots", language)}
        </p>
      </div>

      {mapUrl && (
        <div className="mt-2 overflow-hidden rounded-2xl border border-[#E5DCCB] bg-[#EDE6D9]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mapUrl} alt="" className="aspect-[16/7] w-full object-cover" loading="lazy" />
        </div>
      )}

      {countries.length > 0 && (
        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide" role="tablist">
          <button
            role="tab"
            aria-selected={selectedCountry === null}
            onClick={() => onSelectCountry(null)}
            className={`shrink-0 rounded-[10px] border border-dashed px-3 py-2 text-[12px] font-semibold transition-colors ${
              selectedCountry === null ? "border-[#B85C38] bg-[#B85C38] text-white" : "border-[#C9B89B] text-[#6B5F52]"
            }`}
          >
            {t("allCountries", language)}
          </button>
          {countries.map((c, i) => {
            const active = selectedCountry === c.countryCode;
            return (
              <button
                key={c.countryCode}
                role="tab"
                aria-selected={active}
                onClick={() => onSelectCountry(active ? null : c.countryCode)}
                style={{ transform: `rotate(${i % 2 === 0 ? -1.5 : 1.5}deg)` }}
                className={`flex shrink-0 items-center gap-2 rounded-[10px] border-2 border-dashed px-3 py-1.5 text-left transition-colors ${
                  active ? "border-[#B85C38] bg-[#F3E2D8]" : "border-[#C9B89B] bg-[#FBF8F2]"
                }`}
              >
                <span className="text-[20px] leading-none">{flag(c.countryCode)}</span>
                <span className="flex flex-col">
                  <span className="text-[12px] font-bold uppercase tracking-wide text-[#1A1613]">
                    {countryName(c.countryCode, language)}
                  </span>
                  <span className="text-[11px] text-[#6B5F52]">
                    {countText(c.cityCount, "nCity", "nCities", language)} · {countText(c.postCount, "nShot", "nShots", language)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
