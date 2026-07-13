"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";
import { apiGet, apiPut, API_BASE } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { t } from "@/lib/i18n";
import type { UserProfile, ProfileUpdatePayload } from "../../../../shared/aura-schema";

// ── Icons ─────────────────────────────────────────────────────────────────────

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

// ── Edit Profile Page ──────────────────────────────────────────────────────────

export default function EditProfilePage() {
  const { token, ready } = useAuth();
  const router = useRouter();
  const { language } = useLanguage();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNameError, setShowNameError] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!ready) return;
    if (!token) { router.push("/login"); return; }
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await apiGet<{ ok: boolean; user: UserProfile }>("/me");
        const userProfile = response.user;
        setProfile(userProfile);
        setName(userProfile.name || "");
        setBio(userProfile.bio || "");
      } catch (err) {
        const errorMessage = (err as Error).message || "Failed to load profile";
        if (errorMessage.includes("Invalid or expired token") ||
            errorMessage.includes("401") ||
            errorMessage.includes("Unauthorized")) {
          router.push("/login");
          return;
        }
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [ready, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!name || name.trim() === "") {
      setShowNameError(true);
      return;
    }

    if (name.length > 10) {
      setError("Name must be 10 characters or less");
      return;
    }

    if ((bio || "").length > 100) {
      setError("Bio must be 100 characters or less");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Upload avatar first if one was selected
      if (pendingAvatarFile) {
        const compressed = await imageCompression(pendingAvatarFile, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 512,
          fileType: "image/webp",
        });
        const formData = new FormData();
        formData.append("avatar", compressed, "avatar.webp");
        const res = await fetch(`${API_BASE}/api/profile/avatar`, {
          method: "POST",
          headers: { Authorization: `Bearer ${getToken()}` },
          credentials: "include",
          body: formData,
        });
        if (!res.ok) throw new Error("Failed to upload avatar");
      }

      const payload: ProfileUpdatePayload = {
        name: name.trim(),
        bio: bio.trim() || undefined,
      };

      await apiPut("/api/profile/update", payload);

      router.push("/profile");
    } catch (err) {
      console.error("Failed to update profile:", err);
      const errorMessage = (err as Error).message || "Failed to update profile";

      // Check for quota error
      if (errorMessage.includes("MAX_WRITE_OPERATIONS_PER_HOUR")) {
        setError("Rate limit exceeded. Please try again in a few minutes.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[15px] text-[#6B5F52]">{t('loading', language)}</p>
      </div>
    );
  }

  // Show error state if profile failed to load
  if (error && !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <p className="text-[15px] font-semibold text-red-600">Failed to load profile</p>
        <p className="mt-2 text-center text-[13px] text-[#6B5F52]">{error}</p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/profile"
            className="rounded-lg bg-[#EDE6D9] px-4 py-2 text-[14px] font-medium text-[#1A1613]"
          >
            {t('goBack', language)}
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-[#B85C38] px-4 py-2 text-[14px] font-medium text-white"
          >
            {t('retry', language)}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-[#F7F3EC]">
      {/* Header */}
      <div className="flex items-center border-b border-[#D4C4A8] px-4 py-3">
        <Link href="/profile" className="mr-3">
          <ChevronLeftIcon className="size-6 text-[#1A1613]" />
        </Link>
        <h1 className="text-[17px] font-semibold text-[#1A1613]">
          {t('editProfileTitle', language)}
        </h1>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto pb-safe">
          {/* Avatar with edit icon */}
          <div className="mt-6 flex justify-center">
            <div className="relative">
              <div className="size-[101px] overflow-hidden rounded-full border-2 border-white shadow-md bg-[#EDE6D9]">
                {(avatarPreview ?? profile?.avatar_url) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarPreview ?? profile!.avatar_url!}
                    alt="Profile avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="text-[32px] font-semibold text-[#B85C38]">
                      {(name || profile?.email || "?")[0].toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={saving}
                className="absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-full bg-[#B85C38] shadow-md disabled:opacity-50"
              >
                <PencilIcon className="size-4 text-white" />
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
          </div>

          {/* Form fields */}
          <div className="mt-6 px-4">
            {/* Error message */}
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 px-4 py-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Name field */}
            <div className="mb-4">
              <label
                htmlFor="name"
                className="mb-1 block text-[13px] font-medium text-[#6B5F52]"
              >
                {t('namePlaceholder', language)}
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setShowNameError(false);
                  setError(null);
                }}
                onBlur={() => setShowNameError(!name || name.trim() === "")}
                maxLength={10}
                className="w-full rounded-lg border border-[#D4C4A8] bg-[#F7F3EC] px-3 py-2.5 text-[16px] text-[#1A1613] outline-none focus:border-[#B85C38] focus:ring-1 focus:ring-[#B85C38]"
              />
              <div className="mt-1 flex items-center justify-between">
                {showNameError && (
                  <span className="text-[13px] text-[#ff0000]">
                    Name is required
                  </span>
                )}
                <span
                  className={`text-[13px] text-[#6B5F52] ${!showNameError ? "ml-auto" : ""}`}
                >
                  {(name || "").length}/10
                </span>
              </div>
            </div>

            {/* Bio field */}
            <div>
              <label
                htmlFor="bio"
                className="mb-1 block text-[13px] font-medium text-[#6B5F52]"
              >
                {t('bioPlaceholder', language)}
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => {
                  setBio(e.target.value);
                  setError(null);
                }}
                placeholder={t('bioHint', language)}
                rows={4}
                maxLength={100}
                className="w-full resize-none rounded-lg border border-[#D4C4A8] bg-[#F7F3EC] px-3 py-2.5 text-[16px] text-[#1A1613] placeholder:text-[#A09080] outline-none focus:border-[#B85C38] focus:ring-1 focus:ring-[#B85C38]"
              />
              <div className="mt-1 flex justify-end">
                <span className="text-[13px] text-[#6B5F52]">
                  {(bio || "").length}/100
                </span>
              </div>
            </div>

            {/* Save button */}
            <div className="mt-6">
              <button
                onClick={handleSave}
                disabled={saving || !name || name.trim() === ""}
                className="w-full rounded-lg bg-[#B85C38] py-3 text-[16px] font-semibold text-white transition-colors hover:bg-[#A84828] disabled:opacity-50"
              >
                {saving ? t('saving', language) : t('saveChanges', language)}
              </button>
            </div>
          </div>

          {/* Account section */}
          <div className="mx-4 mt-8 border-t border-[#EDE6D9] pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-[#6B5F52]">{t('account', language)}</p>
                <p className="mt-1 text-[15px] text-[#1A1613]">{profile?.email || "Loading..."}</p>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
