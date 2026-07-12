"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";
import { getToken } from "@/lib/auth";
import { apiGet, API_BASE } from "@/lib/api";
import { useLanguage } from "@/hooks/useLanguage";
import { TAG_GROUPS, translateTag, translateGroupLabel } from "@/lib/i18n";
import type { AuraWithUser } from "../../../../../shared/aura-schema";

const MAX_TAGS = 5;
const MAX_PHOTOS = 3;

interface NewPhoto {
  file: File;
  preview: string;
}

export default function EditPostPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { language } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [existingUrls, setExistingUrls] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<NewPhoto[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    if (!getToken()) { router.replace("/login"); return; }

    apiGet<{ ok: boolean; aura: AuraWithUser }>(`/api/auras/${postId}`)
      .then((res) => {
        const p = res.aura;
        setTitle(p.title ?? "");
        setDescription(p.description ?? "");
        setSelectedTags(p.tags ?? []);
        setExistingUrls(p.image_urls ?? []);
        setLoading(false);
      })
      .catch(() => { setError("Failed to load post"); setLoading(false); });
  }, [postId]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPhotos = existingUrls.length + newPhotos.length;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const incoming: NewPhoto[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith("image/")) {
        incoming.push({ file, preview: URL.createObjectURL(file) });
      }
    }

    setNewPhotos((prev) => {
      const combined = [...prev, ...incoming];
      const total = existingUrls.length + combined.length;
      if (total > MAX_PHOTOS) {
        const canAdd = MAX_PHOTOS - existingUrls.length - prev.length;
        combined.slice(Math.max(0, canAdd)).forEach((p) => URL.revokeObjectURL(p.preview));
        setError(`Maximum ${MAX_PHOTOS} photos allowed.`);
        setTimeout(() => setError(null), 4000);
        return canAdd > 0 ? combined.slice(0, canAdd) : prev;
      }
      setError(null);
      return combined;
    });

    e.target.value = "";
  };

  const removeExisting = (idx: number) => setExistingUrls((prev) => prev.filter((_, i) => i !== idx));

  const removeNew = (idx: number) => {
    setNewPhotos((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSave = async () => {
    if (!title.trim()) { setError("Please enter a title"); return; }
    if (totalPhotos === 0) { setError("At least one photo is required"); return; }

    setSaving(true);
    setError(null);

    const token = getToken();
    const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      let res: Response;

      if (newPhotos.length > 0) {
        const formData = new FormData();
        for (let i = 0; i < newPhotos.length; i++) {
          const compressed = await imageCompression(newPhotos[i].file, {
            maxSizeMB: 4, maxWidthOrHeight: 3840, initialQuality: 0.92, fileType: "image/webp",
          });
          formData.append("images", compressed, `aura_${i + 1}.webp`);
        }
        formData.append("metadata", JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
          keep_image_urls: existingUrls,
        }));
        res = await fetch(`${API_BASE}/api/auras/${postId}`, { method: "PUT", headers: authHeader, body: formData });
      } else {
        res = await fetch(`${API_BASE}/api/auras/${postId}`, {
          method: "PUT",
          headers: { ...authHeader, "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || undefined,
            tags: selectedTags.length > 0 ? selectedTags : undefined,
            image_urls: existingUrls,
          }),
        });
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to save");
      }

      router.push(`/post/${postId}`);
    } catch (err) {
      setError((err as Error).message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F3EC]">
        <p className="text-[15px] text-[#6B5F52]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-[#F7F3EC]">
      <div className="flex-1 overflow-y-auto pb-24">
        <input ref={fileInputRef} type="file" accept="image/*,.heic,.heif" multiple onChange={handleFileSelect} className="hidden" />

        {/* Header */}
        <div className="flex items-center gap-3 px-3 pt-3 pb-1">
          <button onClick={() => router.back()} className="flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="size-6 text-[#1A1613]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="text-[24px] font-semibold text-[#1A1613]">Edit Post</h1>
        </div>

        {/* Photos strip */}
        <div className="mt-4 px-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[12px] text-[#6B5F52]">
              {totalPhotos > 1
                ? `Photos (${totalPhotos}/3)`
                : "Photo"}
            </p>
            {totalPhotos < MAX_PHOTOS && (
              <button onClick={() => fileInputRef.current?.click()} className="text-[12px] text-[#B85C38] underline">
                Add photo
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {existingUrls.map((url, i) => (
              <div key={`e-${i}`} className="relative h-[120px] w-[90px] shrink-0 overflow-hidden rounded-[12px] bg-[#D4C4A8]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  onClick={() => removeExisting(i)}
                  className="absolute right-[5px] top-[5px] flex size-[20px] items-center justify-center rounded-full bg-black/50"
                >
                  <svg className="size-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}

            {newPhotos.map((p, i) => (
              <div key={`n-${i}`} className="relative h-[120px] w-[90px] shrink-0 overflow-hidden rounded-[12px] bg-[#D4C4A8] ring-2 ring-[#C9973A]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.preview} alt="" className="h-full w-full object-cover" />
                <button
                  onClick={() => removeNew(i)}
                  className="absolute right-[5px] top-[5px] flex size-[20px] items-center justify-center rounded-full bg-black/50"
                >
                  <svg className="size-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}

            {totalPhotos < MAX_PHOTOS && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex h-[120px] w-[90px] shrink-0 items-center justify-center rounded-[12px] border border-dashed border-[#D4C4A8] bg-[#EDE6D9]"
              >
                <svg className="size-[28px] text-[#A09080]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="mt-5 px-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full rounded-[8px] border border-[#D4C4A8] px-3 py-[10px] text-[16px] text-[#1A1613] outline-none placeholder:text-[#A09080] focus:border-[#B85C38]"
          />
        </div>

        {/* Description */}
        <div className="mt-3 px-3">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={5}
            className="w-full resize-none rounded-[8px] border border-[#D4C4A8] px-3 py-[10px] text-[16px] text-[#1A1613] outline-none placeholder:text-[#A09080] focus:border-[#B85C38]"
          />
        </div>

        {/* Tags */}
        <div className="mt-5 px-3">
          <div className="flex items-center justify-between">
            <p className="text-[16px] font-medium text-black">Tags</p>
            <p className="text-[12px] text-[#A09080]">{selectedTags.length}/{MAX_TAGS}</p>
          </div>
          <div className="mt-3 space-y-4">
            {TAG_GROUPS.map((group) => (
              <div key={group.key}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#A09080]">
                  {translateGroupLabel(group, language)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.tags.map((tag) => {
                    const selected = selectedTags.includes(tag);
                    const disabled = !selected && selectedTags.length >= MAX_TAGS;
                    return (
                      <button
                        key={tag}
                        disabled={disabled}
                        onClick={() =>
                          setSelectedTags((prev) =>
                            selected ? prev.filter((t) => t !== tag) : [...prev, tag]
                          )
                        }
                        className={`flex items-center gap-1 rounded-[6px] px-[10px] py-[4px] text-[12px] transition-colors ${
                          selected
                            ? "bg-[#B85C38] text-white"
                            : disabled
                            ? "border border-[#D4C4A8] text-[#A09080]"
                            : "border border-[#D4C4A8] text-[#6B5F52]"
                        }`}
                      >
                        <svg className="size-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                          <line x1="7" y1="7" x2="7.01" y2="7" />
                        </svg>
                        {translateTag(tag, language)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-3 mt-4 rounded-lg bg-red-50 px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Save button */}
        <div className="mb-6 mt-8 px-3">
          <button
            onClick={handleSave}
            disabled={saving || totalPhotos === 0}
            className="w-full rounded-[40px] bg-[#1A1613] py-[13px] text-[20px] font-medium text-white transition-opacity disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
