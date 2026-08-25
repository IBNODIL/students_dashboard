"use client";

import { Loader2 } from "lucide-react";

export function ActionLoadingOverlay({
  open,
  message,
  description,
}: {
  open: boolean;
  message: string;
  description?: string;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
      <div className="flex w-full max-w-sm flex-col items-center justify-center rounded-2xl border border-white/20 bg-white/90 px-6 py-8 text-center shadow-2xl dark:bg-slate-900/90">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
        <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {message}
        </p>
        {description ? (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
