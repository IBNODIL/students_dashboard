import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

type Role = "SUPERADMIN" | "ADMIN" | "TEACHER" | "STUDENT";

interface RouteContext {
  params: Promise<{
    userId: string;
  }>;
}

/**
 * GET /api/admin/users/[userId]
 *
 * Get one user's details.
 */
export async function GET(
  _req: NextRequest,
  { params }: RouteContext
) {
  try {
    const prisma = getPrisma();

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const caller = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        id: true,
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

    const { userId } = await params;

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        userNumber: true,
        email: true,
        name: true,
        role: true,
        active: true,
        teacherId: true,
        studentId: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        deleteAfter: true,

        teacher: {
          select: {
            id: true,
            name: true,
          },
        },

        student: {
          select: {
            studentId: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // ADMIN cannot view SUPERADMIN or ADMIN users.
    if (
      caller.role === "ADMIN" &&
      (user.role === "SUPERADMIN" || user.role === "ADMIN")
    ) {
      return NextResponse.json(
        { error: "You do not have permission to view this user" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      user,
    });
  } catch (error) {
    console.error("Get user failed:", error);

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

/**
 * PATCH /api/admin/users/[userId]
 *
 * Supported changes:
 *
 * {
 *   name: "New Name"
 * }
 *
 * {
 *   active: true
 * }
 *
 * {
 *   active: false
 * }
 *
 * IMPORTANT:
 * Role cannot be changed.
 */
export async function PATCH(
  req: NextRequest,
  { params }: RouteContext
) {
  try {
    const prisma = getPrisma();

    // ─────────────────────────────────────────────
    // 1. Check current session
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

    const callerRole = caller.role as Role;

    // ─────────────────────────────────────────────
    // 3. Get target user
    // ─────────────────────────────────────────────

    const { userId } = await params;

    const targetUser = await prisma.user.findUnique({
      where: {
        id: userId,
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

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const targetRole = targetUser.role as Role;

    // ─────────────────────────────────────────────
    // 4. Permission rules
    // ─────────────────────────────────────────────

    // Nobody can modify themselves through this endpoint.
    if (targetUser.id === caller.id) {
      return NextResponse.json(
        {
          error:
            "You cannot modify your own account from user management.",
        },
        { status: 403 }
      );
    }

    // ADMIN can only manage TEACHER and STUDENT.
    if (
      callerRole === "ADMIN" &&
      (targetRole === "ADMIN" || targetRole === "SUPERADMIN")
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
    // 5. Parse request
    // ─────────────────────────────────────────────

    let body: {
      name?: unknown;
      active?: unknown;
      role?: unknown;
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
    // 6. IMPORTANT: Role is permanent
    // ─────────────────────────────────────────────

    if (body.role !== undefined) {
      return NextResponse.json(
        {
          error:
            "User role cannot be changed after account creation.",
        },
        { status: 400 }
      );
    }

    const changes: Record<string, unknown> = {};

    // ─────────────────────────────────────────────
    // 7. Change name
    // ─────────────────────────────────────────────

    if (body.name !== undefined) {
      if (typeof body.name !== "string") {
        return NextResponse.json(
          { error: "Name must be a string" },
          { status: 400 }
        );
      }

      const newName = body.name.trim();

      if (!newName) {
        return NextResponse.json(
          { error: "Name cannot be empty" },
          { status: 400 }
        );
      }

      if (newName.length > 100) {
        return NextResponse.json(
          { error: "Name is too long" },
          { status: 400 }
        );
      }

      if (newName !== targetUser.name) {
        changes.name = newName;
      }
    }

    // ─────────────────────────────────────────────
    // 8. Activate / deactivate
    // ─────────────────────────────────────────────

    if (body.active !== undefined) {
      if (typeof body.active !== "boolean") {
        return NextResponse.json(
          { error: "active must be a boolean" },
          { status: 400 }
        );
      }

      // Do not allow activating a user that is
      // waiting for permanent deletion.
      if (
        body.active === true &&
        targetUser.deleteAfter !== null
      ) {
        return NextResponse.json(
          {
            error:
              "This user is pending deletion and cannot be activated. Cancel the deletion first.",
          },
          { status: 400 }
        );
      }

      if (body.active !== targetUser.active) {
        changes.active = body.active;
      }
    }

    // Nothing actually changed.
    if (Object.keys(changes).length === 0) {
      return NextResponse.json(
        {
          error: "No changes were provided.",
        },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────
    // 9. Update user + audit log
    // ─────────────────────────────────────────────

    const oldData = {
      name: targetUser.name,
      active: targetUser.active,
      role: targetUser.role,
    };

    const updatedUser = await prisma.user.update({
      where: {
        id: targetUser.id,
      },
      data: {
        ...(changes.name !== undefined
          ? {
              name: changes.name as string,
            }
          : {}),

        ...(changes.active !== undefined
          ? {
              active: changes.active as boolean,
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
        teacherId: true,
        studentId: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        deleteAfter: true,
      },
    });

    // Determine audit action.
    let action: "UPDATE" | "ACTIVATE" | "DEACTIVATE" = "UPDATE";

    if (changes.active === true) {
      action = "ACTIVATE";
    } else if (changes.active === false) {
      action = "DEACTIVATE";
    }

    await prisma.auditLog.create({
      data: {
        actorId: caller.id,
        targetUserId: targetUser.id,
        action,
        description:
          action === "UPDATE"
            ? `Updated user ${targetUser.userNumber}`
            : action === "ACTIVATE"
              ? `Activated user ${targetUser.userNumber}`
              : `Deactivated user ${targetUser.userNumber}`,
        oldData,
        newData: {
          name: updatedUser.name,
          active: updatedUser.active,
          role: updatedUser.role,
        },
        ipAddress:
          req.headers.get("x-forwarded-for") ??
          req.headers.get("x-real-ip"),
        userAgent: req.headers.get("user-agent"),
      },
    });

    return NextResponse.json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update user failed:", error);

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

/**
 * DELETE /api/admin/users/[userId]
 *
 * This is NOT permanent deletion.
 *
 * ADMIN:
 *   User becomes inactive and is scheduled
 *   for deletion after 7 days.
 *
 * SUPERADMIN:
 *   User becomes inactive and is scheduled
 *   for deletion after 3 days.
 *
 * Permanent deletion has its own endpoint:
 *
 * DELETE /api/admin/users/[userId]/permanent
 */
export async function DELETE(
  req: NextRequest,
  { params }: RouteContext
) {
  try {
    const prisma = getPrisma();

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

    const callerRole = caller.role as Role;

    // ─────────────────────────────────────────────
    // 3. Get target
    // ─────────────────────────────────────────────

    const { userId } = await params;

    const targetUser = await prisma.user.findUnique({
      where: {
        id: userId,
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

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const targetRole = targetUser.role as Role;

    // ─────────────────────────────────────────────
    // 4. Nobody can delete themselves
    // ─────────────────────────────────────────────

    if (targetUser.id === caller.id) {
      return NextResponse.json(
        {
          error: "You cannot delete your own account.",
        },
        { status: 403 }
      );
    }

    // ─────────────────────────────────────────────
    // 5. ADMIN restrictions
    // ─────────────────────────────────────────────

    if (
      callerRole === "ADMIN" &&
      (targetRole === "ADMIN" || targetRole === "SUPERADMIN")
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
    // 6. Already pending deletion
    // ─────────────────────────────────────────────

    if (targetUser.deleteAfter) {
      return NextResponse.json(
        {
          error: "This user is already pending deletion.",
          deleteAfter: targetUser.deleteAfter,
        },
        { status: 409 }
      );
    }

    // ─────────────────────────────────────────────
    // 7. Determine deletion delay
    // ─────────────────────────────────────────────

    const now = new Date();

    const daysUntilDeletion =
      callerRole === "SUPERADMIN" ? 3 : 7;

    const deleteAfter = new Date(now);

    deleteAfter.setDate(
      deleteAfter.getDate() + daysUntilDeletion
    );

    // ─────────────────────────────────────────────
    // 8. Soft delete
    // ─────────────────────────────────────────────

    const deletedUser = await prisma.user.update({
      where: {
        id: targetUser.id,
      },
      data: {
        active: false,
        deletedAt: now,
        deleteAfter,
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
        targetUserId: targetUser.id,
        action: "DELETE",
        description:
          callerRole === "SUPERADMIN"
            ? `Scheduled user ${targetUser.userNumber} for deletion in 3 days`
            : `Scheduled user ${targetUser.userNumber} for deletion in 7 days`,
        oldData: {
          active: targetUser.active,
          deletedAt: targetUser.deletedAt,
          deleteAfter: targetUser.deleteAfter,
        },
        newData: {
          active: false,
          deletedAt: now,
          deleteAfter,
        },
        ipAddress:
          req.headers.get("x-forwarded-for") ??
          req.headers.get("x-real-ip"),
        userAgent: req.headers.get("user-agent"),
      },
    });

    return NextResponse.json({
      message:
        callerRole === "SUPERADMIN"
          ? "User deactivated and scheduled for deletion in 3 days."
          : "User deactivated and scheduled for deletion in 7 days.",
      user: deletedUser,
    });
  } catch (error) {
    console.error("Delete user failed:", error);

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