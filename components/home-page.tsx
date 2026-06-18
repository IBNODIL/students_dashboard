"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dashboard } from "@/components/dashboard";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useLanguage } from "@/contexts/language-context";
import { RefreshCw } from "lucide-react";

export function HomePageClient() {
  const { t } = useLanguage();
  const router = useRouter();
  const [seeding, setSeeding] = useState(false);

  async function handleRefresh() {
    if (seeding) return;
    setSeeding(true);

    // Navigate to the progress page first so the admin sees logs
    // appear as soon as the maintenance flag flips on.
    router.push("/update-time");

    try {
      // Fire the seed job. This call runs synchronously on the server and
      // resolves only once the whole job finishes (success or failure) —
      // we don't need its response here since /update-time is already
      // polling /api/admin/seed-status independently.
      const res = await fetch("/api/admin/seed", { method: "POST" });
      if (!res.ok) {
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

              {/* ── Refresh Data button ─────────────────────────────── */}
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

        <Dashboard />
      </main>

      <footer className="border-t mt-12 py-4 text-center text-xs text-muted-foreground bg-white/40 shadow-sm">
        {t.footer}
      </footer>
    </div>
  );
}