"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { t } from "@/lib/i18n";
import CityList, { toCityEntries } from "@/components/CityList";
import type { ArchetypeStats, CityEntry } from "../../../../shared/aura-schema";

export default function MyCitiesPage() {
  const { token, ready } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();
  const [cities, setCities] = useState<CityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!token) { router.push("/login"); return; }
    apiGet<{ ok: boolean; stats: ArchetypeStats }>("/api/auras/me/stats")
      .then((res) => setCities(toCityEntries(res.stats)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ready, token]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#F7F3EC]">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button onClick={() => router.back()} aria-label="Back" className="flex items-center justify-center">
          <svg className="size-6 text-[#1A1613]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="text-[17px] font-bold text-[#1A1613]">{t("citiesTitle", language)}</span>
      </div>

      <div className="flex-1 px-4 pb-10">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <p className="text-[15px] text-[#6B5F52]">Loading…</p>
          </div>
        ) : (
          <CityList cities={cities} language={language} emptyText={t("noCitiesYetDesc", language)} />
        )}
      </div>
    </div>
  );
}
