"use client";

import Link from "next/link";
import Image from "next/image";
import type { Guide } from "@/lib/atlas";
import { walkingMinutes } from "@/lib/atlas";
import { countText, distanceText, guideHref } from "@/lib/atlasFormat";
import { flag } from "@/lib/places";
import { t, type Language } from "@/lib/i18n";

interface Props {
  guides: Guide[];
  userId: string | null;
  language: Language;
  emptyTitle: string;
  emptyMessage: string;
}

/** Each city with 3+ spots, shown as a photo walk card. */
export default function GuideCards({ guides, userId, language, emptyTitle, emptyMessage }: Props) {
  if (guides.length === 0 || !userId) {
    return (
      <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
        <svg className="size-8 text-[#1A1613]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" /><path d="M9 4v14M15 6v14" />
        </svg>
        <p className="mt-4 text-[17px] font-semibold text-[#1A1613]">{emptyTitle}</p>
        <p className="mt-1 text-[13px] leading-[1.5] text-[#6B5F52]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 px-3 py-3 sm:grid-cols-2">
      {guides.map((g) => {
        const thumbs = g.stops.slice(1, 4).map((s) => s.posts[0]?.image_urls?.[0]).filter(Boolean) as string[];
        return (
          <Link
            key={g.key}
            href={guideHref(userId, g.city, g.countryCode)}
            className="block overflow-hidden rounded-2xl border border-[#E5DCCB] bg-white"
          >
            <div className="relative aspect-[16/9] bg-[#EDE6D9]">
              {g.coverUrl && <Image src={g.coverUrl} alt="" fill className="object-cover" sizes="(max-width: 640px) 100vw, 360px" />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
              <div className="absolute bottom-2.5 left-3 right-3 text-white">
                <p className="text-[17px] font-bold leading-tight drop-shadow">
                  {flag(g.countryCode)} {t("guideTitle", language).replace("{city}", g.city)}
                </p>
                <p className="mt-0.5 text-[12px] opacity-90">
                  {countText(g.stops.length, "nStop", "nStops", language)} · {distanceText(g.distanceM, language)} · {t("walkMinutes", language).replace("{n}", String(walkingMinutes(g.distanceM)))}
                </p>
              </div>
            </div>
            {thumbs.length > 0 && (
              <div className="flex gap-1 p-1">
                {thumbs.map((src, i) => (
                  <div key={i} className="relative aspect-square flex-1 overflow-hidden rounded-lg bg-[#EDE6D9]">
                    <Image src={src} alt="" fill className="object-cover" sizes="120px" />
                  </div>
                ))}
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
