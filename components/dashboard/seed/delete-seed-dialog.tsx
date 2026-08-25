"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

import { deleteSeedSource } from "./api";
import type { SeedSource } from "./types";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = {
  source: SeedSource | null;
  onClose(): void;
  onDeleted(id: string): void;
};

export function DeleteSeedDialog({
  source,
  onClose,
  onDeleted,
}: Props) {
  const [loading, setLoading] = useState(false);

  if (!source) return null;
  const selectedSource = source;

  async function remove() {
    try {
      setLoading(true);

      await deleteSeedSource(selectedSource.id);

      onDeleted(selectedSource.id);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog
      open={!!source}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent>

        <AlertDialogHeader>

          <AlertDialogTitle>
            Delete Seed Source
          </AlertDialogTitle>

          <AlertDialogDescription>
            This action cannot be undone.
            <br />
            <br />
            Are you sure you want to delete
            <strong> &quot;{selectedSource.name}&quot;</strong>?
          </AlertDialogDescription>

        </AlertDialogHeader>

        <AlertDialogFooter>

          <AlertDialogCancel>
            Cancel
          </AlertDialogCancel>

          <AlertDialogAction
            onClick={remove}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}

            Delete
          </AlertDialogAction>

        </AlertDialogFooter>

      </AlertDialogContent>
    </AlertDialog>
  );
}
