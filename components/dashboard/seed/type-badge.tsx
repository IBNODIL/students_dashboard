"use client";

import { Badge } from "@/components/ui/badge";
import type { SeedSourceType } from "./types";

type Props = {
  type: SeedSourceType;
};

const config: Record<
  SeedSourceType,
  {
    label: string;
    className: string;
  }
> = {
  ATTENDANCE: {
    label: "Attendance",
    className:
      "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100",
  },
  GRADES: {
    label: "Grades",
    className:
      "bg-green-100 text-green-700 border-green-200 hover:bg-green-100",
  },
  CREDITS: {
    label: "Credits",
    className:
      "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100",
  },
  LIVE_STATUS: {
    label: "Live Status",
    className:
      "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100",
  },
};

export function TypeBadge({ type }: Props) {
  return (
    <Badge
      variant="outline"
      className={config[type].className}
    >
      {config[type].label}
    </Badge>
  );
}