"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { ArchetypeStats } from "../../../../shared/aura-schema";

export default function MyCitiesPage() {
  const { token, ready } = useAuth();
  const router = useRouter();
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!token) { router.push("/login"); return; }
    apiGet<{ ok: boolean; stats: ArchetypeStats }>("/api/auras/me/stats")
      .then((res) => setCities(res.stats?.cities ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ready, token]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-screen w-full flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button onClick={() => router.back()} className="flex items-center justify-center">
          <svg className="size-6 text-[#1e1e1e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="text-[17px] font-bold text-[#1e1e1e]">Cities</span>
      </div>

      <div className="flex-1 px-4 pb-10">
        {loading && (
          <div className="flex items-center justify-center py-24">
            <p className="text-[15px] text-[#757575]">Loading…</p>
          </div>
        )}

        {!loading && cities.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="text-[40px]">🗺️</span>
            <p className="mt-4 text-[17px] font-semibold text-[#1e1e1e]">No cities yet</p>
            <p className="mt-1 text-[14px] text-[#757575]">Upload a verified post to add your first city.</p>
          </div>
        )}

        {!loading && cities.length > 0 && (
          <ul className="mt-2 flex flex-col gap-3">
            {cities.map((city, i) => (
              <li key={city} className="flex items-center gap-4 rounded-2xl bg-[#f9f9f9] px-4 py-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#fff3f3]">
                  <svg className="size-5 text-[#fa6460]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-semibold text-[#1e1e1e]">{city}</p>
                </div>
                <span className="text-[13px] font-medium text-[#d9d9d9]">#{i + 1}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
