"use client";

import { Dashboard } from "@/components/dashboard";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useLanguage } from "@/contexts/language-context";

export default function Home() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-sky-50 to-blue-50">
      <header className="border-b bg-card shadow-md sticky top-0 z-10">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm shadow-sm">
                SA
              </div>
              <div>
                <h1 className="text-base font-semibold leading-none">
                  {t.appTitle}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t.appSubtitle}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-muted-foreground hidden md:block">
                {t.legend}
              </div>
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">{t.overviewTitle}</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {t.overviewDesc}
          </p>
        </div>
        <Dashboard />
      </main>

      <footer className="border-t mt-12 py-4 text-center text-xs text-muted-foreground bg-white/40 shadow-sm">
        {t.footer}
      </footer>
    </div>
  );
}


