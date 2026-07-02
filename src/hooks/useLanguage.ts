"use client";

import { useState, useEffect, useCallback } from "react";
import { getLanguage, setLanguage as saveLanguage, cycleLanguage, Language } from "@/lib/i18n";

export function useLanguage() {
  const [language, setLangState] = useState<Language>("en");

  useEffect(() => {
    setLangState(getLanguage());
    const handler = () => setLangState(getLanguage());
    window.addEventListener("aura:languagechange", handler);
    return () => window.removeEventListener("aura:languagechange", handler);
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    saveLanguage(lang);
    setLangState(lang);
  }, []);

  const cycle = useCallback(() => {
    const next = cycleLanguage();
    setLangState(next);
  }, []);

  return { language, setLanguage, cycle };
}
