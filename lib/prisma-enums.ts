/**
 * Re-exports of Prisma-schema enums as plain TypeScript string-literal unions.
 *
 * The generated Prisma client in this repo bundles a minimal stub that omits
 * enum exports (Role, AuditAction, etc.). Until `prisma generate` can be run
 * against the real engine binary, these definitions keep TypeScript happy and
 * are 100% compatible — Prisma stores enum values as plain strings in Postgres,
 * so these types are semantically identical to what Prisma would generate.
 */

export type Role = "SUPERADMIN" | "ADMIN" | "TEACHER" | "STUDENT";
export const Role = {
  SUPERADMIN: "SUPERADMIN" as Role,
  ADMIN: "ADMIN" as Role,
  TEACHER: "TEACHER" as Role,
  STUDENT: "STUDENT" as Role,
} as const;

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "RESET_PASSWORD"
  | "DEACTIVATE"
  | "ACTIVATE"
  | "DELETE"
  | "PERMANENT_DELETE"
  | "SEED_SOURCE_CREATE"
  | "SEED_SOURCE_UPDATE"
  | "SEED_SOURCE_DELETE";
export const AuditAction = {
  CREATE: "CREATE" as AuditAction,
  UPDATE: "UPDATE" as AuditAction,
  RESET_PASSWORD: "RESET_PASSWORD" as AuditAction,
  DEACTIVATE: "DEACTIVATE" as AuditAction,
  ACTIVATE: "ACTIVATE" as AuditAction,
  DELETE: "DELETE" as AuditAction,
  PERMANENT_DELETE: "PERMANENT_DELETE" as AuditAction,
  SEED_SOURCE_CREATE: "SEED_SOURCE_CREATE" as AuditAction,
  SEED_SOURCE_UPDATE: "SEED_SOURCE_UPDATE" as AuditAction,
  SEED_SOURCE_DELETE: "SEED_SOURCE_DELETE" as AuditAction,
} as const;

export type SeedSourceType = "ATTENDANCE" | "GRADES" | "CREDITS" | "LIVE_STATUS";
export const SeedSourceType = {
  ATTENDANCE: "ATTENDANCE" as SeedSourceType,
  GRADES: "GRADES" as SeedSourceType,
  CREDITS: "CREDITS" as SeedSourceType,
  LIVE_STATUS: "LIVE_STATUS" as SeedSourceType,
} as const;

/** Replacement for Prisma.JsonNull — use null directly in JSON fields */
export const JsonNull = null;

/** Replacement for Prisma.InputJsonValue */
export type InputJsonValue =
  | string
  | number
  | boolean
  | null
  | InputJsonValue[]
  | { [key: string]: InputJsonValue };

/** Replacement for Prisma.JsonValue */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
