"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { API_BASE, apiGet, apiPost } from "@/lib/api";
import { getToken, getUserId } from "@/lib/auth";
import { findGuide, distanceM, googleMapsWalkUrl, guideMapUrl, walkingMinutes, type AtlasPost } from "@/lib/atlas";
import { countText, distanceText } from "@/lib/atlasFormat";
import { flag } from "@/lib/places";
import { getMapboxToken } from "@/lib/geocoding";
import { useLanguage } from "@/hooks/useLanguage";
import { t, translateTag } from "@/lib/i18n";
import type { PublicProfileResponse, SavedAurasResponse } from "../../../../../../shared/aura-schema";

const LONG_WALK_M = 10000;

function GuidePageInner() {
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();
  const { language } = useLanguage();
  const userId = params.id as string;
  const city = decodeURIComponent(params.city as string);
  const country = search.get("country");

  const [name, setName] = useState("");
  const [posts, setPosts] = useState<AtlasPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [token, setToken] = useState("");
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setViewerId(getUserId());
    setLoggedIn(!!getToken());
    getMapboxToken().then(setToken).catch(() => {});
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        setLoading(true);
        const auth = getToken();
        const res = await fetch(`${API_BASE}/api/users/${userId}`, {
          headers: auth ? { Authorization: `Bearer ${auth}` } : {},
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const data: PublicProfileResponse = await res.json();
        setName(data.profile?.name ?? "");
        setPosts(data.posts ?? []);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setFailed(true);
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [userId]);

  const guide = useMemo(() => findGuide(posts, city, country), [posts, city, country]);
  const isOwn = !!viewerId && viewerId === userId;

  // Which of this guide's posts the viewer has already saved
  useEffect(() => {
    if (!loggedIn || isOwn || !guide) return;
    apiGet<SavedAurasResponse>("/api/saves")
      .then((r) => setSavedIds(new Set((r.auras ?? []).map((a) => a.id))))
      .catch(() => {});
  }, [loggedIn, isOwn, guide]);

  const allSaved = !!guide && guide.postIds.length > 0 && guide.postIds.every((id) => savedIds.has(id));
  const mapUrl = useMemo(() => (guide ? guideMapUrl(guide.stops, { token, width: 640, height: 360 }) : null), [guide, token]);
  const walk = useMemo(() => (guide ? googleMapsWalkUrl(guide.stops) : null), [guide]);

  const saveGuide = async () => {
    if (!guide || saving) return;
    if (!loggedIn) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    setSaving(true);
    setSaveError(false);
    try {
      const ids = guide.postIds.slice(0, 50);
      await apiPost("/api/saves/bulk", { aura_ids: ids });
      setSavedIds((prev) => new Set([...prev, ...ids]));
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  const share = async () => {
    try { await navigator.clipboard.writeText(window.location.href); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const back = () => (window.history.length > 1 ? router.back() : router.push(isOwn ? "/profile" : `/profile/${userId}`));

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F3EC]">
        <p className="text-[15px] text-[#6B5F52]">{t("loading", language)}</p>
      </div>
    );
  }

  if (failed || !guide) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F7F3EC] px-8 text-center">
        <p className="text-[16px] font-semibold text-[#1A1613]">
          {failed && !loggedIn ? t("loginToSeeProfile", language) : t("guideNotFound", language)}
        </p>
        {failed && !loggedIn ? (
          <Link href={`/login?redirect=/profile/${userId}`} className="w-full max-w-xs rounded-xl bg-[#B85C38] py-3 text-[15px] font-semibold text-white">
            {t("logIn", language)}
          </Link>
        ) : (
          <Link href={`/profile/${userId}`} className="rounded-lg bg-[#EDE6D9] px-4 py-2 text-[14px] font-medium text-[#1A1613]">
            {t("backToProfile", language)}
          </Link>
        )}
      </div>
    );
  }

  const minutes = walkingMinutes(guide.distanceM);
  const title = t("guideTitle", language).replace("{city}", guide.city);

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-[#F7F3EC]">
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button onClick={back} aria-label={t("goBack", language)} className="flex items-center">
          <svg className="size-6 text-[#1A1613]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="truncate text-[17px] font-bold text-[#1A1613]">{flag(guide.countryCode)} {title}</span>
      </div>

      <div className="flex-1 overflow-y-auto pb-10">
        <div className="lg:mx-auto lg:max-w-[740px]">
          <div className="px-4">
            <Link href={`/profile/${userId}`} className="text-[13px] text-[#6B5F52]">
              {t("guideBy", language).replace("{name}", name || "—")}
            </Link>
            <p className="mt-1 text-[13px] text-[#1A1613]">
              {countText(guide.stops.length, "nStop", "nStops", language)} · {distanceText(guide.distanceM, language)} · {t("walkMinutes", language).replace("{n}", String(minutes))}
            </p>

            {mapUrl && (
              <div className="mt-3 overflow-hidden rounded-2xl border border-[#E5DCCB] bg-[#EDE6D9]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mapUrl} alt="" className="aspect-[16/9] w-full object-cover" />
              </div>
            )}

            <div className="mt-3 flex gap-2">
              {isOwn ? (
                <button onClick={share} className="flex-1 rounded-xl bg-[#EDE6D9] py-2.5 text-[14px] font-semibold text-[#1A1613]">
                  {copied ? t("copied", language) : t("shareGuide", language)}
                </button>
              ) : (
                <button
                  onClick={saveGuide}
                  disabled={saving || allSaved}
                  className={`flex-1 rounded-xl py-2.5 text-[14px] font-semibold transition-colors ${
                    allSaved ? "border border-[#D4C4A8] bg-[#F7F3EC] text-[#6B5F52]" : "bg-[#EDE6D9] text-[#1A1613]"
                  }`}
                >
                  {!loggedIn ? t("logInToSave", language) : saving ? t("savingGuide", language) : allSaved ? `✓ ${t("guideSaved", language)}` : t("saveGuide", language)}
                </button>
              )}
              {walk && (
                <a href={walk.url} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-xl bg-[#B85C38] py-2.5 text-center text-[14px] font-semibold text-white">
                  {t("startPhotoWalk", language)}
                </a>
              )}
            </div>
            {saveError && <p className="mt-2 text-[12px] text-red-600">{t("saveGuideFailed", language)}</p>}
            {(walk?.truncated || guide.distanceM > LONG_WALK_M) && (
              <p className="mt-2 text-[12px] text-[#6B5F52]">
                {[walk?.truncated && t("walkTruncated", language), guide.distanceM > LONG_WALK_M && t("longWalkHint", language)].filter(Boolean).join(" ")}
              </p>
            )}
          </div>

          <ol className="mt-5 px-4">
            {guide.stops.map((stop, i) => {
              const next = guide.stops[i + 1];
              const cover = stop.posts[0];
              const tags = [...new Set(stop.posts.flatMap((p) => p.tags ?? []))].slice(0, 3);
              return (
                <li key={stop.id}>
                  <Link href={`/post/${cover.id}`} className="flex gap-3 rounded-2xl bg-white p-2.5">
                    <div className="relative size-[76px] shrink-0 overflow-hidden rounded-xl bg-[#EDE6D9]">
                      {cover.image_urls?.[0] && <Image src={cover.image_urls[0]} alt="" fill className="object-cover" sizes="76px" />}
                      <span className="absolute left-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-[#B85C38] text-[12px] font-bold text-white">{i + 1}</span>
                    </div>
                    <div className="min-w-0 flex-1 py-0.5">
                      <p className="truncate text-[15px] font-semibold text-[#1A1613]">{stop.name || cover.title}</p>
                      {stop.posts.length > 1 && (
                        <p className="text-[12px] text-[#6B5F52]">{countText(stop.posts.length, "nShot", "nShots", language)}</p>
                      )}
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {stop.evening && (
                          <span className="rounded-md bg-[#F3E2D8] px-2 py-0.5 text-[11px] font-medium text-[#B85C38]">☀︎ {t("eveningStop", language)}</span>
                        )}
                        {tags.map((tag) => (
                          <span key={tag} className="rounded-md bg-[#EDE6D9] px-2 py-0.5 text-[11px] text-[#6B5F52]">{translateTag(tag, language)}</span>
                        ))}
                      </div>
                    </div>
                  </Link>
                  {next && (
                    <div className="flex items-center gap-2 py-1.5 pl-[46px] text-[12px] text-[#A09080]">
                      <span className="h-5 border-l-2 border-dotted border-[#C9B89B]" />
                      {distanceText(distanceM(stop, next), language)}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}

export default function GuidePage() {
  return (
    <Suspense>
      <GuidePageInner />
    </Suspense>
  );
}
