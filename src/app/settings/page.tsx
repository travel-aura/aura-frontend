"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";
import { t } from "@/lib/i18n";

export default function SettingsPage() {
  const router = useRouter();
  const { token, ready, logout } = useAuth();
  const { language } = useLanguage();
  const [email, setEmail] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!token) { router.replace("/login"); return; }
    fetch(`${API_BASE}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setEmail(d?.user?.email ?? d?.email ?? null))
      .catch(() => {});
  }, [ready, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = async () => {
    setLoggingOut(true);
    const current = getToken();
    try {
      // Ends the session on the server too, so the saved refresh token stops working
      if (current) {
        await fetch(`${API_BASE}/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${current}` } });
      }
    } catch { /* offline: still log out on this device */ }
    logout();
    router.replace("/login");
  };

  const handleDelete = async () => {
    if (confirmText !== "DELETE") return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/account`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      if (!res.ok) throw new Error(String(res.status));
      logout();
      router.replace("/");
    } catch {
      setError(t("deleteAccountFailed", language));
      setDeleting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#F7F3EC]">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button onClick={() => router.back()} aria-label="Back" className="flex items-center justify-center">
          <svg className="size-6 text-[#1A1613]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="text-[17px] font-bold text-[#1A1613]">{t("settings", language)}</span>
      </div>

      <div className="flex-1 px-4 pb-10 lg:mx-auto lg:w-full lg:max-w-[620px]">
        {/* Account */}
        <p className="mt-4 mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#A09080]">{t("account", language)}</p>
        <div className="rounded-2xl bg-[#EDE6D9]">
          {email && <p className="border-b border-[#D4C4A8] px-4 py-3.5 text-[14px] text-[#6B5F52]">{email}</p>}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full px-4 py-3.5 text-left text-[15px] font-semibold text-[#1A1613] disabled:opacity-60"
          >
            {loggingOut ? t("loggingOut", language) : t("logOut", language)}
          </button>
        </div>

        {/* Delete account */}
        <div className="mt-8 rounded-2xl border border-[#E8C9BC] bg-[#F9ECE7] px-4 py-4">
          <p className="text-[15px] font-semibold text-[#8A3F22]">{t("deleteAccount", language)}</p>
          <p className="mt-1 text-[13px] text-[#6B5F52]">{t("deleteAccountDesc", language)}</p>

          {!showDelete ? (
            <button
              onClick={() => setShowDelete(true)}
              className="mt-3 rounded-lg border border-[#C0392B] px-4 py-2 text-[13px] font-semibold text-[#C0392B]"
            >
              {t("deleteAccount", language)}
            </button>
          ) : (
            <div className="mt-3">
              <label className="block text-[13px] text-[#1A1613]" htmlFor="confirm-delete">{t("deleteAccountPrompt", language)}</label>
              <input
                id="confirm-delete"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoComplete="off"
                autoCapitalize="characters"
                className="mt-1.5 w-full rounded-lg border border-[#D4C4A8] bg-white px-3 py-2 text-[15px] outline-none focus:border-[#C0392B]"
              />
              {error && <p className="mt-2 text-[13px] text-[#C0392B]">{error}</p>}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => { setShowDelete(false); setConfirmText(""); setError(null); }}
                  disabled={deleting}
                  className="flex-1 rounded-lg bg-[#EDE6D9] py-2 text-[13px] font-semibold text-[#1A1613]"
                >
                  {t("cancel", language)}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={confirmText !== "DELETE" || deleting}
                  className="flex-1 rounded-lg bg-[#C0392B] py-2 text-[13px] font-semibold text-white disabled:opacity-40"
                >
                  {deleting ? t("deletingAccount", language) : t("deleteAccountButton", language)}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
