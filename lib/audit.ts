import { getPrisma } from "@/lib/prisma";
import { AuditAction, InputJsonValue } from "@/lib/prisma-enums";

interface CreateAuditLogParams {
  actorId: string;
  targetUserId?: string | null;
  action: AuditAction;
  description: string;
  oldData?: InputJsonValue | null;
  newData?: InputJsonValue | null;
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
      // Prisma treats null and undefined differently for Json fields:
      // null = store SQL NULL; undefined = omit the field (use DB default).
      // We use null directly rather than the removed Prisma.JsonNull sentinel.
      oldData: oldData === undefined ? undefined : (oldData ?? null),
      newData: newData === undefined ? undefined : (newData ?? null),
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    },
  });
}
