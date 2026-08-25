"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Dashboard } from "@/components/dashboard";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useLanguage } from "@/contexts/language-context";
import { RefreshCw } from "lucide-react";

export function HomePageClient() {
  const { t } = useLanguage();
  const router = useRouter();
  const [seeding, setSeeding] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const handleReady = useCallback(() => {
    setIsReady(true);
  }, []);

  async function handleRefresh() {
    if (seeding) return;
    setSeeding(true);
    // Navigate immediately rather than waiting for the full response — the
    // refresh can legitimately take a couple of minutes, and /update-time
    // polls its own status independently. If this request turns out to be
    // rejected with 409 (someone else's refresh is already running), that's
    // fine: /update-time will just show that other run's live progress,
    // which is the correct thing for this visitor to see either way.
    router.push("/update-time");
    try {
      const res = await fetch("/api/admin/seed", { method: "POST" });
      if (!res.ok && res.status !== 409) {
        console.error("Seed request failed:", res.status);
      }
    } catch (err) {
      console.error("Seed request error:", err);
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-sky-50 to-blue-50">

      {/* ── Full-screen initial loading overlay ─────────────────────────── */}
      {!isReady && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-blue-50 via-sky-50 to-blue-50">
          {/* Logo mark */}
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-lg shadow-lg">
            SA
          </div>

          {/* Spinner */}
          <div className="relative h-16 w-16">
            <svg
              className="h-16 w-16 animate-spin"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="4"
                className="text-muted-foreground/20"
              />
              <path
                d="M60 32a28 28 0 0 0-28-28"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                className="text-primary"
              />
            </svg>
          </div>

          {/* Text */}
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-foreground animate-pulse">
              Loading…
            </p>
            <p className="text-xs text-muted-foreground">
              Fetching student data, please wait
            </p>
          </div>
        </div>
      )}

      {/* ── Main page (rendered in background, revealed once ready) ──────── */}
      <div
        className={
          isReady
            ? "opacity-100 transition-opacity duration-300"
            : "opacity-0 pointer-events-none"
        }
      >
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

                {/* ── Refresh Data button ───────────────────────────── */}
                <button
                  onClick={handleRefresh}
                  disabled={seeding}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  title="Fetch latest data from APIs and update the database"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${seeding ? "animate-spin" : ""}`}
                  />
                  <span className="hidden sm:inline">
                    {seeding ? "Refreshing…" : "Refresh Data"}
                  </span>
                </button>

                <LanguageSwitcher />
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">
              {t.overviewTitle}
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              {t.overviewDesc}
            </p>
          </div>

          <Dashboard onReady={handleReady} />
        </main>

        <footer className="border-t mt-12 py-4 text-center text-xs text-muted-foreground bg-white/40 shadow-sm">
          {t.footer}
        </footer>
      </div>
    </div>
  );
}