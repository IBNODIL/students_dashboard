import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import bcryptjs from "bcryptjs";
import { NextResponse } from "next/server";

const prisma = getPrisma();

export const POST = async (req: Request) => {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const passwordMatch = await bcryptjs.compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Delete existing session if any
    await prisma.session.deleteMany({
      where: { userId: user.id },
    });

    // Create a new session
    const sessionExpiresAt = new Date();
    sessionExpiresAt.setDate(sessionExpiresAt.getDate() + 7); // 7 days

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        expiresAt: sessionExpiresAt,
      },
    });

    // Set session cookie - Using standard Better Auth cookie format
    const response = NextResponse.json(
      {
        message: "Login successful",
        user: { id: user.id, email: user.email },
      },
      { status: 200 }
    );

    response.cookies.set("better-auth.session_token", session.id, {
      maxAge: 7 * 24 * 60 * 60,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("Sign-in error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: String(error) },
      { status: 500 }
    );
  }
};
