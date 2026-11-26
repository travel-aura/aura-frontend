import type { Language } from "@/lib/i18n";

// Country code → localized country name ("pt" → "Portugal" / "葡萄牙")
export function countryName(code: string | null, language: Language): string | null {
  if (!code) return null;
  try {
    const locale = language === "zh-CN" ? "zh-Hans" : language === "zh-TW" ? "zh-Hant" : "en";
    return new Intl.DisplayNames([locale], { type: "region" }).of(code.toUpperCase()) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

// Country code → flag emoji ("pt" → 🇵🇹)
export function flag(code: string | null): string {
  if (!code || code.length !== 2) return "📍";
  return String.fromCodePoint(...code.toUpperCase().split("").map((c) => 0x1f1a5 + c.charCodeAt(0)));
}
