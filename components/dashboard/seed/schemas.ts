import { z } from "zod";

export const seedSourceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name is required"),

  url: z
    .string()
    .trim()
    .url("Enter a valid URL"),

  type: z.enum([
    "ATTENDANCE",
    "GRADES",
    "CREDITS",
    "LIVE_STATUS",
  ]),

  active: z.boolean(),
});

export type SeedSourceForm =
  z.infer<typeof seedSourceSchema>;