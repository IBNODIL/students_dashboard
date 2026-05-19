import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const prisma = getPrisma();

export async function GET(request: NextRequest) {
  try {
    // Try to get session using Better Auth first
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (session) {
      return NextResponse.json(session);
    }

    // If Better Auth session doesn't work, try our custom cookie
    const sessionToken = request.cookies.get("better-auth.session_token")?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Look up session in database
    const sessionData = await prisma.session.findUnique({
      where: { id: sessionToken },
      include: { user: true },
    });

    if (!sessionData || new Date(sessionData.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: sessionData.user.id,
        email: sessionData.user.email,
        emailVerified: sessionData.user.emailVerified,
        createdAt: sessionData.user.createdAt,
        updatedAt: sessionData.user.updatedAt,
      },
      session: {
        id: sessionData.id,
        userId: sessionData.userId,
        expiresAt: sessionData.expiresAt,
        createdAt: sessionData.createdAt,
        updatedAt: sessionData.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get session error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: String(error) },
      { status: 500 }
    );
  }
}
