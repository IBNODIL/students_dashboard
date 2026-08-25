"use client";

import { Plus, Search } from "lucide-react";

import type { SeedSourceType } from "./types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  search: string;
  filter: string;

  onSearchChange(value: string): void;
  onFilterChange(value: string): void;
  onCreate(): void;
};

export function SeedToolbar({
  search,
  filter,
  onSearchChange,
  onFilterChange,
  onCreate,
}: Props) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 lg:flex-row lg:items-center lg:justify-between">

      <div className="flex flex-1 flex-col gap-4 md:flex-row">

        <div className="relative flex-1">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />

          <Input
            value={search}
            placeholder="Search by name or URL..."
            className="pl-9"
            onChange={(e) =>
              onSearchChange(e.target.value)
            }
          />
        </div>

        <Select
          value={filter}
          onValueChange={onFilterChange}
        >
          <SelectTrigger className="w-full md:w-56">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>

          <SelectContent>

            <SelectItem value="ALL">
              All Types
            </SelectItem>

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

      <Button onClick={onCreate}>
        <Plus className="mr-2 h-4 w-4" />
        Add Source
      </Button>

    </div>
  );
}