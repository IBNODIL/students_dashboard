"use client";

import { useEffect, useRef, useState } from "react";

type Mode = "maintenance" | "seeding" | "done" | "error";

export default function UpdateTimePage() {
  const [mode, setMode] = useState<Mode>("maintenance");
  const [logs, setLogs] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  useEffect(() => {
    const isSeeding = sessionStorage.getItem("seed_sse_active");
    if (!isSeeding) {
      setMode("maintenance");
      return;
    }

    // Admin triggered a seed — listen for log messages via BroadcastChannel
    setMode("seeding");
    const channel = new BroadcastChannel("seed_logs");

    channel.onmessage = (evt) => {
      const parsed = evt.data;
      if (parsed?.log) {
        setLogs((prev) => [...prev, parsed.log]);
      }
      if (parsed?.done) {
        setMode("done");
        channel.close();
        sessionStorage.removeItem("seed_sse_active");
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
      }
      if (parsed?.error) {
        setMode("error");
        setErrorMsg(parsed.error);
        channel.close();
        sessionStorage.removeItem("seed_sse_active");
      }
    };

    return () => {
      channel.close();
    };
  }, []);

  // ── Maintenance screen (regular visitors) ────────────────────────────────
  if (mode === "maintenance") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 via-sky-50 to-blue-50">
        <div className="text-center max-w-sm px-6">
          <div className="flex justify-center mb-6">
            <span className="text-5xl">🔧</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            We&apos;ll be right back
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            The dashboard is being updated with fresh data. This usually takes
            less than a minute. Please refresh in a moment.
          </p>
          <div className="mt-8 flex justify-center">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 text-xs text-blue-500 hover:underline"
          >
            Refresh page
          </button>
        </div>
      </div>
    );
  }

  // ── Done ─────────────────────────────────────────────────────────────────
  if (mode === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 via-sky-50 to-blue-50">
        <div className="text-center max-w-sm px-6">
          <span className="text-5xl">✅</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-4 mb-2">
            Update complete
          </h1>
          <p className="text-gray-500 text-sm">Redirecting to dashboard…</p>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (mode === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-red-50 to-white">
        <div className="max-w-lg w-full px-6">
          <div className="bg-white border border-red-200 rounded-xl p-6 shadow-sm">
            <h1 className="text-lg font-bold text-red-700 mb-2">
              ❌ Seed failed
            </h1>
            <p className="text-sm text-red-600 font-mono break-words mb-4">
              {errorMsg}
            </p>
            {logs.length > 0 && (
              <details className="mt-2">
                <summary className="text-xs text-gray-500 cursor-pointer">
                  Show logs
                </summary>
                <div className="mt-2 max-h-48 overflow-y-auto bg-gray-950 rounded-lg p-3 text-xs font-mono text-green-400 space-y-1">
                  {logs.map((l, i) => (
                    <div key={i}>{l}</div>
                  ))}
                </div>
              </details>
            )}
            <button
              onClick={() => (window.location.href = "/")}
              className="mt-4 text-sm text-blue-600 hover:underline"
            >
              ← Back to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Live log terminal (admin sees this during seeding) ────────────────────
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm font-medium text-gray-300">
            Data refresh in progress
          </span>
        </div>
        <span className="text-xs text-gray-500 font-mono">
          {logs.length} log entries
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 font-mono text-sm">
        {logs.length === 0 && (
          <p className="text-gray-600 text-xs">Connecting to seed stream…</p>
        )}
        {logs.map((line, i) => (
          <div key={i} className="flex gap-3 mb-1">
            <span className="text-gray-600 select-none w-6 text-right shrink-0">
              {i + 1}
            </span>
            <span
              className={
                line.startsWith("❌") || line.toLowerCase().includes("error")
                  ? "text-red-400"
                  : line.startsWith("✅") || line.startsWith("🎉")
                  ? "text-green-400"
                  : line.startsWith("⚠️")
                  ? "text-yellow-400"
                  : line.startsWith("🔒") || line.startsWith("🔓")
                  ? "text-orange-400"
                  : "text-gray-300"
              }
            >
              {line}
            </span>
          </div>
        ))}
        <div ref={logEndRef} />
      </div>

      <div className="border-t border-gray-800 px-6 py-3 text-xs text-gray-600 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        Visitors are on the maintenance page until this completes
      </div>
    </div>
  );
}