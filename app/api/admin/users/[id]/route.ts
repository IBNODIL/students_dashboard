import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

import { getPrisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Prisma } from "@prisma/client";

type Role = "SUPERADMIN" | "ADMIN" | "TEACHER" | "STUDENT";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function PATCH(
  req: NextRequest,
  { params }: RouteContext
) {
  const prisma = getPrisma();

  try {
    // ─────────────────────────────────────────────
    // 1. Check session
    // ─────────────────────────────────────────────

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // ─────────────────────────────────────────────
    // 2. Get caller
    // ─────────────────────────────────────────────

    const caller = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        id: true,
        userNumber: true,
        role: true,
      },
    });

    if (
      !caller ||
      (caller.role !== "SUPERADMIN" && caller.role !== "ADMIN")
    ) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // ─────────────────────────────────────────────
    // 3. Get target user
    // ─────────────────────────────────────────────

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const target = await prisma.user.findUnique({
      where: {
        id: id,
      },
      select: {
        id: true,
        userNumber: true,
        email: true,
        name: true,
        role: true,
        active: true,
        deletedAt: true,
        deleteAfter: true,
      },
    });

    if (!target) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // ─────────────────────────────────────────────
    // 4. Cannot modify yourself
    // ─────────────────────────────────────────────

    if (target.id === caller.id) {
      return NextResponse.json(
        { error: "You cannot modify your own account here." },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────
    // 5. ADMIN restrictions
    //
    // ADMIN can only manage TEACHER/STUDENT
    // ─────────────────────────────────────────────

    if (
      caller.role === "ADMIN" &&
      (target.role === "ADMIN" || target.role === "SUPERADMIN")
    ) {
      return NextResponse.json(
        {
          error:
            "ADMIN can only manage TEACHER and STUDENT users.",
        },
        { status: 403 }
      );
    }

    // ─────────────────────────────────────────────
    // 6. Parse body
    // ─────────────────────────────────────────────

    let body: {
      name?: string;
      active?: boolean;
    };

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────
    // 7. Determine what action is requested
    // ─────────────────────────────────────────────

    const hasNameChange = typeof body.name === "string";
    const hasActiveChange = typeof body.active === "boolean";

    if (!hasNameChange && !hasActiveChange) {
      return NextResponse.json(
        {
          error:
            "Nothing to update. Provide name or active.",
        },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────
    // 8. EDIT NAME
    // ─────────────────────────────────────────────

    if (hasNameChange) {
      const newName = body.name!.trim();

      if (!newName) {
        return NextResponse.json(
          { error: "Name cannot be empty." },
          { status: 400 }
        );
      }

      if (newName.length > 100) {
        return NextResponse.json(
          { error: "Name is too long." },
          { status: 400 }
        );
      }

      const updated = await prisma.user.update({
        where: {
          id: target.id,
        },
        data: {
          name: newName,
          updatedById: caller.id,
        },
        select: {
          id: true,
          userNumber: true,
          email: true,
          name: true,
          role: true,
          active: true,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: caller.id,
          targetUserId: target.id,
          action: "UPDATE",

          description: `Updated name of user ${target.userNumber}`,

          oldData: {
            name: target.name,
          },

          newData: {
            name: newName,
          },

          ipAddress:
            req.headers.get("x-forwarded-for") ??
            req.headers.get("x-real-ip"),

          userAgent: req.headers.get("user-agent"),
        },
      });

      return NextResponse.json({
        success: true,
        action: "UPDATE",
        user: updated,
      });
    }

    // ─────────────────────────────────────────────
    // 9. ACTIVATE / DEACTIVATE
    // ─────────────────────────────────────────────

    if (hasActiveChange) {
      const newActive = body.active!;

      if (newActive === target.active) {
        return NextResponse.json(
          {
            error: `User is already ${newActive ? "active" : "inactive"
              }.`,
          },
          { status: 400 }
        );
      }

      // SUPERADMIN accounts should not be deactivated
      // through this endpoint.
      if (
        target.role === "SUPERADMIN" &&
        newActive === false
      ) {
        return NextResponse.json(
          {
            error:
              "SUPERADMIN accounts cannot be deactivated here.",
          },
          { status: 403 }
        );
      }

      const updated = await prisma.user.update({
        where: {
          id: target.id,
        },
        data: {
          active: newActive,
          updatedById: caller.id,

          // If activating again, clear deletion schedule.
          ...(newActive
            ? {
              deletedAt: null,
              deleteAfter: null,
            }
            : {}),
        },
        select: {
          id: true,
          userNumber: true,
          email: true,
          name: true,
          role: true,
          active: true,
          deletedAt: true,
          deleteAfter: true,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: caller.id,
          targetUserId: target.id,
          action: newActive ? "ACTIVATE" : "DEACTIVATE",

          description: newActive
            ? `Activated user ${target.userNumber}`
            : `Deactivated user ${target.userNumber}`,

          oldData: {
            active: target.active,
          },

          newData: {
            active: newActive,
          },

          ipAddress:
            req.headers.get("x-forwarded-for") ??
            req.headers.get("x-real-ip"),

          userAgent: req.headers.get("user-agent"),
        },
      });

      return NextResponse.json({
        success: true,
        action: newActive ? "ACTIVATE" : "DEACTIVATE",
        user: updated,
      });
    }

    return NextResponse.json(
      { error: "Unsupported action." },
      { status: 400 }
    );
  } catch (error) {
    console.error("User PATCH failed:", error);

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

// ─────────────────────────────────────────────────────────────
// DELETE
//
// Normal DELETE does NOT permanently delete.
// It puts the account into pending deletion.
// ─────────────────────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: RouteContext
) {
  const prisma = getPrisma();

  try {
    // ─────────────────────────────────────────────
    // 1. Session
    // ─────────────────────────────────────────────

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // ─────────────────────────────────────────────
    // 2. Caller
    // ─────────────────────────────────────────────

    const caller = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        id: true,
        userNumber: true,
        role: true,
      },
    });

    if (
      !caller ||
      (caller.role !== "SUPERADMIN" && caller.role !== "ADMIN")
    ) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // ─────────────────────────────────────────────
    // 3. Target
    // ─────────────────────────────────────────────

    const { id } = await params;

    const target = await prisma.user.findUnique({
      where: {
        id: id,
      },
      select: {
        id: true,
        userNumber: true,
        email: true,
        name: true,
        role: true,
        active: true,
        deletedAt: true,
        deleteAfter: true,
      },
    });

    if (!target) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // ─────────────────────────────────────────────
    // 4. Cannot delete yourself
    // ─────────────────────────────────────────────

    if (target.id === caller.id) {
      return NextResponse.json(
        {
          error: "You cannot delete your own account.",
        },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────
    // 5. ADMIN restrictions
    // ─────────────────────────────────────────────

    if (
      caller.role === "ADMIN" &&
      (target.role === "ADMIN" || target.role === "SUPERADMIN")
    ) {
      return NextResponse.json(
        {
          error:
            "ADMIN can only delete TEACHER and STUDENT users.",
        },
        { status: 403 }
      );
    }

    // ─────────────────────────────────────────────
    // 6. Already pending deletion?
    // ─────────────────────────────────────────────

    if (target.deleteAfter) {
      return NextResponse.json(
        {
          error: "This user is already pending deletion.",
          deleteAfter: target.deleteAfter,
        },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────
    // 7. Determine deletion period
    //
    // ADMIN target → 7 days
    // SUPERADMIN target → 3 days
    // TEACHER/STUDENT → 7 days
    //
    // SUPERADMIN can permanently delete immediately
    // through /permanent.
    // ─────────────────────────────────────────────

    const daysUntilDeletion =
      target.role === "SUPERADMIN" ? 3 : 7;

    const now = new Date();

    const deleteAfter = new Date(now);
    deleteAfter.setDate(
      deleteAfter.getDate() + daysUntilDeletion
    );

    // ─────────────────────────────────────────────
    // 8. Mark pending deletion
    // ─────────────────────────────────────────────

    const updated = await prisma.user.update({
      where: {
        id: target.id,
      },
      data: {
        active: false,
        deletedAt: now,
        deleteAfter,
        updatedById: caller.id,
      },
      select: {
        id: true,
        userNumber: true,
        email: true,
        name: true,
        role: true,
        active: true,
        deletedAt: true,
        deleteAfter: true,
      },
    });

    // ─────────────────────────────────────────────
    // 9. Audit log
    // ─────────────────────────────────────────────

    await prisma.auditLog.create({
      data: {
        actorId: caller.id,
        targetUserId: target.id,
        action: "DELETE",

        description: `Marked user ${target.userNumber} for deletion in ${daysUntilDeletion} days`,

        oldData: {
          active: target.active,
          deletedAt: target.deletedAt
            ? target.deletedAt.toISOString()
            : null,
          deleteAfter: target.deleteAfter
            ? new Date(target.deleteAfter).toISOString()
            : null,
        },

        newData: {
          active: false,
          deletedAt: now.toISOString(),
          deleteAfter: deleteAfter.toISOString(),
        },

        ipAddress:
          req.headers.get("x-forwarded-for") ??
          req.headers.get("x-real-ip"),

        userAgent: req.headers.get("user-agent"),
      },
    });

    return NextResponse.json({
      success: true,
      action: "DELETE",
      message: `User ${target.userNumber} is scheduled for deletion.`,
      deleteAfter,
      user: updated,
    });
  } catch (error) {
    console.error("User DELETE failed:", error);

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