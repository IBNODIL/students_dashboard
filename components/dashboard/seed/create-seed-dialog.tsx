"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createSeedSource } from "./api";
import { seedSourceSchema, type SeedSourceForm } from "./schemas";
import { SEED_SOURCE_TYPES } from "./constants";
import type { SeedSource } from "./types";

import {
  Dialog,
  DialogContent,
  DialogDescription,
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

type Props = {
  open: boolean;
  onOpenChange(open: boolean): void;
  onCreated(source: SeedSource): Promise<void> | void;
};

export function CreateSeedDialog({
  open,
  onOpenChange,
  onCreated,
}: Props) {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SeedSourceForm>({
    resolver: zodResolver(seedSourceSchema),
    defaultValues: {
      name: "",
      url: "",
      type: "ATTENDANCE",
      active: true,
    },
  });

  const type = watch("type");

  useEffect(() => {
    if (open) {
      reset({
        name: "",
        url: "",
        type: "ATTENDANCE",
        active: true,
      });
    }
  }, [open, reset]);

  async function submit(values: SeedSourceForm) {
    try {
      setLoading(true);

      const created = await createSeedSource(values);

      await onCreated(created);

      toast.success("Seed source created");

      onOpenChange(false);
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Failed to create source"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-lg">

        <DialogHeader>
          <DialogTitle>
            Add Seed Source
          </DialogTitle>

          <DialogDescription>
            Register a new data source.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(submit)}
          className="space-y-5"
        >
          <div className="space-y-2">
            <Label>Name</Label>

            <Input
              placeholder="Attendance API"
              {...register("name")}
            />

            {errors.name && (
              <p className="text-sm text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>URL</Label>

            <Input
              placeholder="https://example.com/api"
              {...register("url")}
            />

            {errors.url && (
              <p className="text-sm text-destructive">
                {errors.url.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Type</Label>

            <Select
              value={type}
              onValueChange={(value) =>
                setValue(
                  "type",
                  value as SeedSourceForm["type"],
                  {
                    shouldValidate: true,
                  }
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {SEED_SOURCE_TYPES.map((item) => (
                  <SelectItem
                    key={item.value}
                    value={item.value}
                  >
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                onOpenChange(false)
              }
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Source
                </>
              )}
            </Button>
          </DialogFooter>
        </form>

      </DialogContent>
    </Dialog>
  );
}