"use client";

import type { SeedSource } from "./types";

import {
  Database,
  CheckCircle2,
  XCircle,
  Layers,
} from "lucide-react";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

type Props = {
  sources: SeedSource[];
};

export function SeedStats({
  sources,
}: Props) {
  const total = sources.length;

  const active = sources.filter(
    (s) => s.active
  ).length;

  const disabled = total - active;

  const types = new Set(
    sources.map((s) => s.type)
  ).size;

  const cards = [
    {
      title: "Total Sources",
      value: total,
      icon: Database,
    },
    {
      title: "Active",
      value: active,
      icon: CheckCircle2,
    },
    {
      title: "Disabled",
      value: disabled,
      icon: XCircle,
    },
    {
      title: "Types",
      value: types,
      icon: Layers,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Card key={card.title}>
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm text-muted-foreground">
                  {card.title}
                </p>

                <h2 className="mt-2 text-3xl font-bold">
                  {card.value}
                </h2>
              </div>

              <div className="rounded-xl bg-primary/10 p-3">
                <Icon className="h-6 w-6 text-primary" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}