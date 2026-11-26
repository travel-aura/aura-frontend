"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { commonCities, cityKey, type Guide } from "@/lib/atlas";
import { guideHref } from "@/lib/atlasFormat";
import { flag } from "@/lib/places";
import { toCityEntries } from "@/components/CityList";
import { t, type Language } from "@/lib/i18n";
import type { ArchetypeStats, CityEntry } from "../../../shared/aura-schema";

interface Props {
  profileUserId: string;
  profileCities: CityEntry[];
  guides: Guide[];
  language: Language;
}

const MAX_CHIPS = 4;

/** For visitors: cities you and this person have both posted in. Hidden when there are none. */
export default function CommonGround({ profileUserId, profileCities, guides, language }: Props) {
  const [myCities, setMyCities] = useState<CityEntry[] | null>(null);

  useEffect(() => {
    if (!getToken()) return;
    apiGet<{ ok: boolean; stats: ArchetypeStats }>("/api/auras/me/stats")
      .then((r) => setMyCities(toCityEntries(r.stats)))
      .catch(() => setMyCities(null));
  }, []);

  if (!myCities) return null;
  const shared = commonCities(myCities, profileCities);
  if (shared.length === 0) return null;

  const guideKeys = new Set(guides.map((g) => g.key));
  const shown = shared.slice(0, MAX_CHIPS);
  const more = shared.length - shown.length;

  return (
    <div className="mx-4 mt-3 rounded-2xl bg-[#F3E2D8] px-3.5 py-3">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-[#B85C38]">{t("bothShot", language)}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {shown.map((c) => {
          const hasGuide = guideKeys.has(cityKey(c.city, c.country_code));
          const href = hasGuide
            ? guideHref(profileUserId, c.city, c.country_code)
            : `/?city=${encodeURIComponent(c.city)}${c.country_code ? `&country=${encodeURIComponent(c.country_code)}` : ""}`;
          return (
            <Link key={`${c.country_code}|${c.city}`} href={href} className="rounded-full bg-white px-3 py-1 text-[13px] font-medium text-[#1A1613]">
              {flag(c.country_code)} {c.city}
            </Link>
          );
        })}
        {more > 0 && <span className="rounded-full px-2 py-1 text-[13px] text-[#6B5F52]">+{more}</span>}
      </div>
    </div>
  );
}
