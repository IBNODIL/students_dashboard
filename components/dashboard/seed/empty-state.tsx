"use client";

import { Database } from "lucide-react";

type Props = {
  onCreate(): void;
};

import { Button } from "@/components/ui/button";

export function EmptyState({
  onCreate,
}: Props) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed py-16">
      <div className="rounded-full bg-primary/10 p-5">
        <Database className="h-10 w-10 text-primary" />
      </div>

      <h2 className="mt-6 text-xl font-semibold">
        No Seed Sources
      </h2>

      <p className="mt-2 max-w-md text-center text-muted-foreground">
        Create your first seed source to start
        importing attendance, grades,
        credits and live status data.
      </p>

      <Button
        className="mt-6"
        onClick={onCreate}
      >
        Add Source
      </Button>
    </div>
  );
}