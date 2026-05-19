"use client";

import { useLanguage } from "@/contexts/language-context";
import type { Language } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: "en", label: "EN", flag: "🇺🇸" },
  { code: "uz", label: "UZ", flag: "🇺🇿" },
  { code: "ja", label: "JA", flag: "🇯🇵" },
  { code: "ru", label: "RU", flag: "🇷🇺" },
];

export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="flex items-center gap-0.5">
      {LANGUAGES.map(({ code, label, flag }) => (
        <button
          key={code}
          onClick={() => setLang(code)}
          className={cn(
            "flex items-center gap-1 h-7 px-2 rounded text-xs font-medium transition-colors",
            lang === code
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          <span>{flag}</span>
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
