"use client";

import { useState } from "react";
import {
  Pencil,
  Trash2,
  ExternalLink,
  Copy,
} from "lucide-react";

import type { SeedSource } from "./types";

import { EditSeedDialog } from "./edit-seed-dialog";
import { DeleteSeedDialog } from "./delete-seed-dialog";
import { SeedStatusBadge } from "./seed-status-badge";
import { TypeBadge } from "./type-badge";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

type Props = {
  sources: SeedSource[];
  onUpdated(source: SeedSource): void;
  onDeleted(id: string): void;
};

export function SeedTable({
  sources,
  onUpdated,
  onDeleted,
}: Props) {
  const [editing, setEditing] =
    useState<SeedSource | null>(null);

  const [deleting, setDeleting] =
    useState<SeedSource | null>(null);

  async function copy(url: string) {
    await navigator.clipboard.writeText(url);
  }

  return (
    <>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-6 py-4 text-left font-medium">
                  Name
                </th>

                <th className="px-6 py-4 text-left font-medium">
                  Type
                </th>

                <th className="px-6 py-4 text-left font-medium">
                  URL
                </th>

                <th className="px-6 py-4 text-center font-medium">
                  Status
                </th>

                <th className="px-6 py-4 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {sources.map((source) => (
                <tr
                  key={source.id}
                  className="border-b transition-colors hover:bg-muted/40"
                >
                  <td className="px-6 py-4 font-medium">
                    {source.name}
                  </td>

                  <td className="px-6 py-4">
                    <TypeBadge
                      type={source.type}
                    />
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="max-w-xs truncate text-sm text-muted-foreground">
                        {source.url}
                      </span>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          copy(source.url)
                        }
                      >
                        <Copy className="h-4 w-4" />
                      </Button>

                      <Button
                        asChild
                        size="icon"
                        variant="ghost"
                      >
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-center">
                    <SeedStatusBadge
                      active={source.active}
                    />
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() =>
                          setEditing(source)
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() =>
                          setDeleting(source)
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <EditSeedDialog
        source={editing}
        onClose={() => setEditing(null)}
        onUpdated={onUpdated}
      />

      <DeleteSeedDialog
        source={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={onDeleted}
      />
    </>
  );
}