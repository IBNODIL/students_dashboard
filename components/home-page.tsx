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

    try {
      // Open a POST to the seed endpoint — it returns an SSE stream.
      // We store the URL in sessionStorage so the update-time page can pick it up.
      // Because EventSource only supports GET, we use a small trick:
      // the POST opens the stream, we pass it through a BroadcastChannel
      // — but the simpler approach is to just navigate to /update-time
      // and let it POST from there via a useEffect.
      //
      // Here we POST directly and store a flag so update-time page knows
      // it should connect immediately.
      const res = await fetch("/api/admin/seed", {
        method: "POST",
      });

      if (!res.ok || !res.body) {
        throw new Error(`Server responded with ${res.status}`);
      }

      // Store the SSE stream in a BroadcastChannel so the update-time page
      // can read logs. Since we can't pass a ReadableStream across pages,
      // we pipe log messages through BroadcastChannel instead.
      const channel = new BroadcastChannel("seed_logs");

      // Navigate to update-time immediately so visitors see maintenance,
      // admin sees the terminal.
      sessionStorage.setItem("seed_sse_active", "1");
      router.push("/update-time");

      // Read the SSE stream in the background and broadcast to the other page
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.replace(/^data: /, "").trim();
          if (!line) continue;
          try {
            const parsed = JSON.parse(line);
            channel.postMessage(parsed);
          } catch {
            // ignore
          }
        }
      }

      channel.close();
    } catch (err) {
      console.error("Seed error:", err);
      setSeeding(false);
      // Could show a toast here
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