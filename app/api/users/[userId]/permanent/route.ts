import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { headers } from "next/headers";

interface RouteContext {
  params: Promise<{
    userId: string;
  }>;
}

export async function DELETE(
  _req: NextRequest,
  { params }: RouteContext
) {
  const prisma = getPrisma();

  try {
    // ─────────────────────────────────────────────────────────────
    // 1. Get the currently logged-in user
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
    // 2. Get caller from database
    // ─────────────────────────────────────────────────────────────
    const caller = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        id: true,
        role: true,
        userNumber: true,
        name: true,
        email: true,
      },
    });

    if (!caller) {
      return NextResponse.json(
        { error: "Caller not found" },
        { status: 401 }
      );
    }

    // ─────────────────────────────────────────────────────────────
    // 3. SUPERADMIN ONLY
    // ─────────────────────────────────────────────────────────────
    if (caller.role !== "SUPERADMIN") {
      return NextResponse.json(
        {
          error:
            "Only SUPERADMIN can permanently delete users.",
        },
        { status: 403 }
      );
    }

    // ─────────────────────────────────────────────────────────────
    // 4. Get target user ID
    // ─────────────────────────────────────────────────────────────
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required." },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────────────────────
    // 5. Prevent deleting yourself
    // ─────────────────────────────────────────────────────────────
    if (userId === caller.id) {
      return NextResponse.json(
        {
          error:
            "You cannot permanently delete your own account.",
        },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────────────────────
    // 6. Find target user
    // ─────────────────────────────────────────────────────────────
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
        teacherId: true,
        studentId: true,
        createdAt: true,
        deletedAt: true,
        deleteAfter: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    // ─────────────────────────────────────────────────────────────
    // 7. Save audit history BEFORE deleting the user
    //
    // Important:
    // We save the information here because after the DELETE
    // we won't be able to query this user anymore.
    // ─────────────────────────────────────────────────────────────
    await prisma.auditLog.create({
      data: {
        actorId: caller.id,
        targetUserId: targetUser.id,
        action: "PERMANENT_DELETE",

        description: `Permanently deleted user ${targetUser.userNumber} (${targetUser.email})`,

        oldData: {
          userNumber: targetUser.userNumber,
          email: targetUser.email,
          name: targetUser.name,
          role: targetUser.role,
          active: targetUser.active,
          teacherId: targetUser.teacherId,
          studentId: targetUser.studentId,
          createdAt: targetUser.createdAt.toISOString(),
          deletedAt: targetUser.deletedAt
            ? targetUser.deletedAt.toISOString()
            : null,
          deleteAfter: targetUser.deleteAfter
            ? targetUser.deleteAfter.toISOString()
            : null,
        },
      },
    });

    // ─────────────────────────────────────────────────────────────
    // 8. Permanently delete user
    //
    // Session and Account have onDelete: Cascade
    // in your Prisma schema, so Better Auth records connected
    // to this user will also be deleted.
    // ─────────────────────────────────────────────────────────────
    await prisma.user.delete({
      where: {
        id: targetUser.id,
      },
    });

    // ─────────────────────────────────────────────────────────────
    // 9. Return success
    // ─────────────────────────────────────────────────────────────
    return NextResponse.json(
      {
        success: true,
        message: `User ${targetUser.userNumber} was permanently deleted.`,
        deletedUser: {
          userNumber: targetUser.userNumber,
          email: targetUser.email,
          name: targetUser.name,
          role: targetUser.role,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Permanent user deletion failed:", error);

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