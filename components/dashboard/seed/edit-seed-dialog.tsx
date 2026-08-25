"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { updateSeedSource } from "./api";
import type {
  SeedSource,
  SeedSourceType,
} from "./types";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Switch } from "@/components/ui/switch";

type Props = {
  source: SeedSource | null;
  onClose(): void;
  onUpdated(source: SeedSource): void;
};

export function EditSeedDialog({
  source,
  onClose,
  onUpdated,
}: Props) {
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] =
    useState<SeedSourceType>("ATTENDANCE");
  const [active, setActive] =
    useState(true);

  useEffect(() => {
    if (!source) return;

    setName(source.name);
    setUrl(source.url);
    setType(source.type);
    setActive(source.active);
  }, [source]);

  if (!source) return null;
  const selectedSource = source;

  async function save() {
    try {
      setLoading(true);

      const updated =
        await updateSeedSource(selectedSource.id, {
          name,
          url,
          type,
          active,
        });

      onUpdated(updated);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={!!source}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Edit Seed Source
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">

          <div className="space-y-2">
            <Label>Name</Label>

            <Input
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <Label>URL</Label>

            <Input
              value={url}
              onChange={(e) =>
                setUrl(e.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Type</Label>

            <Select
              value={type}
              onValueChange={(v) =>
                setType(v as SeedSourceType)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="ATTENDANCE">
                  Attendance
                </SelectItem>

                <SelectItem value="GRADES">
                  Grades
                </SelectItem>

                <SelectItem value="CREDITS">
                  Credits
                </SelectItem>

                <SelectItem value="LIVE_STATUS">
                  Live Status
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label>Active</Label>

            <Switch
              checked={active}
              onCheckedChange={setActive}
            />
          </div>

        </div>

        <DialogFooter>

          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            onClick={save}
            disabled={loading}
          >
            {loading && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}

            Save Changes
          </Button>

        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
