import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

import { getPrisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const prisma = getPrisma();

  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const caller = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    });

    if (!caller || caller.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    if (caller.id === id) {
      return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        userNumber: true,
        email: true,
        name: true,
        role: true,
        deleteAfter: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.auditLog.create({
      data: {
        actorId: caller.id,
        targetUserId: targetUser.id,
        action: "PERMANENT_DELETE",
        description: `Permanently deleted user ${targetUser.userNumber}`,
        oldData: {
          userNumber: targetUser.userNumber,
          email: targetUser.email,
          name: targetUser.name,
          role: targetUser.role,
        },
        ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip"),
        userAgent: req.headers.get("user-agent"),
      },
    });

    await prisma.user.delete({ where: { id: targetUser.id } });

    return NextResponse.json({ success: true, message: "User permanently deleted" });
  } catch (error) {
    console.error("Permanent delete failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
