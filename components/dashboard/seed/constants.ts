import type { SeedSourceType } from "./types";

export const SEED_SOURCE_TYPES: {
  value: SeedSourceType;
  label: string;
}[] = [
  {
    value: "ATTENDANCE",
    label: "Attendance",
  },
  {
    value: "GRADES",
    label: "Grades",
  },
  {
    value: "CREDITS",
    label: "Credits",
  },
  {
    value: "LIVE_STATUS",
    label: "Live Status",
  },
];

export const TYPE_COLORS: Record<
  SeedSourceType,
  string
> = {
  ATTENDANCE:
    "bg-blue-100 text-blue-700 border-blue-200",

  GRADES:
    "bg-green-100 text-green-700 border-green-200",

  CREDITS:
    "bg-purple-100 text-purple-700 border-purple-200",

  LIVE_STATUS:
    "bg-orange-100 text-orange-700 border-orange-200",
};