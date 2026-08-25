import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { headers } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    const prisma = getPrisma();

    // ─────────────────────────────────────────────────────────────
    // 1. Check session
    // ─────────────────────────────────────────────────────────────
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // ─────────────────────────────────────────────────────────────
    // 2. Get caller
    // ─────────────────────────────────────────────────────────────
    const caller = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!caller) {
      return NextResponse.json(
        { error: "Caller not found" },
        { status: 401 }
      );
    }

    // ─────────────────────────────────────────────────────────────
    // 3. Only ADMIN and SUPERADMIN can see history
    // ─────────────────────────────────────────────────────────────
    if (
      caller.role !== "ADMIN" &&
      caller.role !== "SUPERADMIN"
    ) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // ─────────────────────────────────────────────────────────────
    // 4. Pagination
    // ─────────────────────────────────────────────────────────────
    const searchParams = req.nextUrl.searchParams;

    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") ?? "1", 10)
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        Number.parseInt(searchParams.get("limit") ?? "20", 10)
      )
    );

    const action = searchParams.get("action");

    // ─────────────────────────────────────────────────────────────
    // 5. Build filter
    // ─────────────────────────────────────────────────────────────
    const where = action
      ? {
        action: action as
          | "CREATE"
          | "UPDATE"
          | "RESET_PASSWORD"
          | "DEACTIVATE"
          | "ACTIVATE"
          | "DELETE"
          | "PERMANENT_DELETE",
      }
      : {};

    // ─────────────────────────────────────────────────────────────
    // 6. Get logs + total
    // ─────────────────────────────────────────────────────────────
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),

      prisma.auditLog.count({
        where,
      }),
    ]);

    // ─────────────────────────────────────────────────────────────
    // 7. Collect user IDs
    //
    // AuditLog intentionally doesn't have a relation to User
    // because target users can be permanently deleted.
    // Therefore we fetch the users separately.
    // ─────────────────────────────────────────────────────────────
    const userIds = Array.from(
      new Set(
        logs.flatMap((log: { actorId: string; targetUserId: string | null }) =>
          [log.actorId, log.targetUserId].filter(
            (id): id is string => id !== null
          )
        )
      )
    );

    const users = await prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        userNumber: true,
        name: true,
        email: true,
        role: true,
      },
    });

    const userMap = new Map(
      users.map((user: { id: string; userNumber: number | null; name: string | null; email: string; role: string }) => [user.id, user])
    );

    // ─────────────────────────────────────────────────────────────
    // 8. Add user information to each log
    // ─────────────────────────────────────────────────────────────
    const formattedLogs = logs.map((log: { id: string; action: string; description: string; actorId: string; targetUserId: string | null; createdAt: Date; oldData: unknown; newData: unknown; ipAddress: string | null; userAgent: string | null }) => ({
      id: log.id,

      action: log.action,

      description: log.description,

      oldData: log.oldData,

      newData: log.newData,

      ipAddress: log.ipAddress,

      userAgent: log.userAgent,

      createdAt: log.createdAt,

      actor: userMap.get(log.actorId) ?? {
        id: log.actorId,
        userNumber: null,
        name: "Deleted user",
        email: null,
        role: null,
      },

      targetUser: log.targetUserId
        ? userMap.get(log.targetUserId) ?? {
          id: log.targetUserId,
          userNumber: null,
          name: "Deleted user",
          email: null,
          role: null,
        }
        : null,
    }));

    return NextResponse.json({
      logs: formattedLogs,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get audit logs failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal server error",
      },
      { status: 500 }
    );
  }
}