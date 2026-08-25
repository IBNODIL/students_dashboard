export type SeedSourceType =
  | "ATTENDANCE"
  | "GRADES"
  | "CREDITS"
  | "LIVE_STATUS";

export interface SeedSource {
  id: string;
  name: string;
  url: string;
  type: SeedSourceType;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SeedSourceInput {
  name: string;
  url: string;
  type: SeedSourceType;
  active: boolean;
}