import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import generator from "generate-password";
import { hashPassword } from "better-auth/crypto";

import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

type Role = "SUPERADMIN" | "ADMIN" | "TEACHER" | "STUDENT";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(
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

    const { id } = await params;

    const targetUser = await prisma.user.findUnique({
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
    // 4. Prevent resetting own password
    // ─────────────────────────────────────────────

    if (targetUser.id === caller.id) {
      return NextResponse.json(
        {
          error:
            "You cannot reset your own password from user management.",
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
            "ADMIN can only reset passwords for TEACHER and STUDENT users.",
        },
        { status: 403 }
      );
    }

    // ─────────────────────────────────────────────
    // 6. Don't reset a pending-deletion account
    // ─────────────────────────────────────────────

    if (targetUser.deleteAfter) {
      return NextResponse.json(
        {
          error:
            "This user is pending deletion. Cancel the deletion before resetting the password.",
        },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────
    // 7. Generate new password
    // ─────────────────────────────────────────────

    const plainPassword = generator.generate({
      length: 12,
      numbers: true,
      uppercase: true,
      lowercase: true,
      symbols: true,
      strict: true,
    });

    // ─────────────────────────────────────────────
    // 8. Hash password using Better Auth's hasher
    // ─────────────────────────────────────────────

    const hashedPassword = await hashPassword(plainPassword);

    // ─────────────────────────────────────────────
    // 9. Find credential account
    // ─────────────────────────────────────────────

    const credentialAccount = await prisma.account.findFirst({
      where: {
        userId: targetUser.id,
        providerId: "credential",
      },
      select: {
        id: true,
      },
    });

    if (!credentialAccount) {
      return NextResponse.json(
        {
          error:
            "This user does not have a credential account.",
        },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────
    // 10. Update password
    // ─────────────────────────────────────────────

    await prisma.account.update({
      where: {
        id: credentialAccount.id,
      },
      data: {
        password: hashedPassword,
      },
    });

    // ─────────────────────────────────────────────
    // 11. Audit log
    // ─────────────────────────────────────────────

    await prisma.auditLog.create({
      data: {
        actorId: caller.id,
        targetUserId: targetUser.id,
        action: "RESET_PASSWORD",

        description: `Reset password for user ${targetUser.userNumber}`,

        newData: {
          passwordReset: true,
        },

        ipAddress:
          req.headers.get("x-forwarded-for") ??
          req.headers.get("x-real-ip"),

        userAgent: req.headers.get("user-agent"),
      },
    });

    // ─────────────────────────────────────────────
    // 12. Return password ONCE
    // ─────────────────────────────────────────────

    return NextResponse.json({
      message:
        "Password reset successfully. Save this password now.",

      user: {
        id: targetUser.id,
        userNumber: targetUser.userNumber,
        email: targetUser.email,
        name: targetUser.name,
      },

      generatedPassword: plainPassword,
    });
  } catch (error) {
    console.error("Reset password failed:", error);

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