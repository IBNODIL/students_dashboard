import { getPrisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const prisma = getPrisma();

export async function POST(request: NextRequest) {
  try {
    // Get session token from cookie
    const sessionToken = request.cookies.get("better-auth.session_token")?.value;

    if (sessionToken) {
      // Delete session from database if it exists
      await prisma.session.deleteMany({
        where: { id: sessionToken },
      });
    }

    // Create response and clear cookie
    const response = NextResponse.json(
      { message: "Logged out successfully" },
      { status: 200 }
    );

    response.cookies.set("better-auth.session_token", "", {
      maxAge: 0,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("Sign-out error:", error);
    return NextResponse.json(
      { error: "An error occurred during sign-out" },
      { status: 500 }
    );
  }
}
