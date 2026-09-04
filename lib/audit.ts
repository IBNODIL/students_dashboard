import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { AuditAction } from "@/lib/prisma-enums";

interface CreateAuditLogParams {
  actorId: string;
  targetUserId?: string | null;
  action: AuditAction;
  description: string;
  oldData?: Prisma.InputJsonValue | null;
  newData?: Prisma.InputJsonValue | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function createAuditLog({
  actorId,
  targetUserId,
  action,
  description,
  oldData,
  newData,
  ipAddress,
  userAgent,
}: CreateAuditLogParams) {
  const prisma = getPrisma();

  return prisma.auditLog.create({
    data: {
      actorId,
      targetUserId: targetUserId ?? null,
      action,
      description,
      // Prisma's nullable Json fields don't accept a plain `null` literal in
      // TypeScript — the generated input type is
      // `Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue`, which
      // intentionally excludes bare `null` so you can't confuse "store a
      // JSON null" with "omit the field". `undefined` still means "omit the
      // field" (use the DB default / leave column untouched), while a plain
      // JS `null` from the caller must be translated to the `Prisma.JsonNull`
      // sentinel to mean "store an actual JSON null value".
      oldData:
        oldData === undefined ? undefined : oldData === null ? Prisma.JsonNull : oldData,
      newData:
        newData === undefined ? undefined : newData === null ? Prisma.JsonNull : newData,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    },
  });
}