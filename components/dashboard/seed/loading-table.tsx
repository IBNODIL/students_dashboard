"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function LoadingTable() {
  return (
    <div className="rounded-xl border">
      <div className="space-y-4 p-6">
        {Array.from({ length: 8 }).map(
          (_, i) => (
            <div
              key={i}
              className="grid grid-cols-5 gap-4"
            >
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          )
        )}
      </div>
    </div>
  );
}