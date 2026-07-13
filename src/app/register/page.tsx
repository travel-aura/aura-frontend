"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiPost, API_BASE } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { AuthResponse } from "../../../shared/aura-schema";
import { useLanguage } from "@/hooks/useLanguage";
import { t } from "@/lib/i18n";

// ── Register Page ──────────────────────────────────────────────────────────────

function RegisterForm() {
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showNameError, setShowNameError] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "";
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { language } = useLanguage();

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || null;

  const handleGoogleCredential = async (credential: string) => {
    setGoogleLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: credential }),
      });
      if (!response.ok) throw new Error(await response.text());
      const data: AuthResponse = await response.json();
      if (data.session?.access_token && data.user?.id) {
        login(data.session.access_token, data.user.id);
        router.push(redirectTo || "/profile");
      }
    } catch {
      setError(t("googleAuthError", language));
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    if (!clientId) return;
    const initButton = () => {
      window.google?.accounts.id.initialize({
        client_id: clientId,
        callback: (res: { credential: string }) => handleGoogleCredential(res.credential),
      });
      const btn = document.getElementById("google-register-btn");
      if (btn) {
        window.google?.accounts.id.renderButton(btn, {
          type: "standard", shape: "rectangular", theme: "outline",
          text: "continue_with", size: "large",
          width: btn.offsetWidth || 320, logo_alignment: "left",
        });
      }
    };
    if (window.google) { initButton(); return; }
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) { existing.addEventListener("load", initButton); return; }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = initButton;
    document.head.appendChild(script);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() === "") {
      setShowNameError(true);
      return;
    }
    setError(null);
    setLoading(true);

    try {
      // backend MVP ignores name for now — we still send it (future-proof)
      const response = await apiPost<AuthResponse>("/auth/register", { name, email, password });

      if (response.session?.access_token && response.user?.id) {
        login(response.session.access_token, response.user.id);
      }

      router.push(redirectTo || "/profile");
    } catch (err: unknown) {
      setError((err as Error).message || "Register failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-[#F7F3EC]">
      {/* Logo */}
      <div className="flex justify-center pt-8">
        <span className="text-[32px] font-bold tracking-tight text-[#1A1613]">
          Aura
        </span>
      </div>

      {/* Form */}
      <div className="flex-1 px-4 pt-12">
        <h1 className="mb-8 text-center text-[24px] font-semibold text-[#1A1613]">
          {t('registerTitle', language)}
        </h1>

        {/* Google Sign-In */}
        {clientId && (
          <div className="mb-5">
            <div
              id="google-register-btn"
              className={`w-full overflow-hidden rounded-lg transition-opacity ${googleLoading ? "opacity-50 pointer-events-none" : ""}`}
            />
          </div>
        )}

        {/* Divider */}
        {clientId && (
          <div className="mb-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#D4C4A8]" />
            <span className="text-[13px] text-[#A09080]">{t('orDivider', language)}</span>
            <div className="h-px flex-1 bg-[#D4C4A8]" />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name field */}
          <div>
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
              }}
              onBlur={() => setShowNameError(name.trim() === "")}
              placeholder={t('yourName', language)}
              maxLength={10}
              required
              className="w-full rounded-lg border border-[#D4C4A8] bg-[#F7F3EC] px-3 py-2.5 text-[16px] text-[#1A1613] placeholder:text-[#A09080] outline-none focus:border-[#B85C38] focus:ring-1 focus:ring-[#B85C38]"
            />
            <div className="mt-1 flex items-center justify-between">
              {showNameError && (
                <span className="text-[13px] text-[#ff0000]">
                  {t('nameRequired', language)}
                </span>
              )}
              <span
                className={`text-[13px] text-[#6B5F52] ${!showNameError ? "ml-auto" : ""}`}
              >
                {name.length}/10
              </span>
            </div>
          </div>

          {/* Email field */}
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-[13px] font-medium text-[#6B5F52]"
            >
              {t('email', language)}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('emailPlaceholder', language)}
              required
              className="w-full rounded-lg border border-[#D4C4A8] bg-[#F7F3EC] px-3 py-2.5 text-[16px] text-[#1A1613] placeholder:text-[#A09080] outline-none focus:border-[#B85C38] focus:ring-1 focus:ring-[#B85C38]"
            />
          </div>

          {/* Password field */}
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-[13px] font-medium text-[#6B5F52]"
            >
              {t('password', language)}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('createPassword', language)}
              required
              minLength={6}
              className="w-full rounded-lg border border-[#D4C4A8] bg-[#F7F3EC] px-3 py-2.5 text-[16px] text-[#1A1613] placeholder:text-[#A09080] outline-none focus:border-[#B85C38] focus:ring-1 focus:ring-[#B85C38]"
            />
            <p className="mt-1 text-[12px] text-[#6B5F52]">
              {t('passwordHint', language)}
            </p>
          </div>

          {/* Submit button */}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#B85C38] py-3 text-[16px] font-semibold text-white transition-colors hover:bg-[#A84828] disabled:opacity-60"
            >
              {loading ? t('creating', language) : t('signUp', language)}
            </button>
          </div>
        </form>

        {/* Login link */}
        <div className="mt-6 text-center">
          <p className="text-[14px] text-[#6B5F52]">
            {t('haveAccount', language)}{" "}
            <Link
              href={redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login"}
              className="font-semibold text-[#B85C38] hover:underline"
            >
              {t('logIn', language)}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
