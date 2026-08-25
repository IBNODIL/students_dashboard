import { NextRequest, NextResponse } from "next/server";
import { getCachedStudentProfileByPublicKey } from "@/lib/cached-student-data";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ publicKey: string }> },
) {
  try {
    const { publicKey } = await params;
    if (!publicKey || publicKey.length < 8 || publicKey.length > 128) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    const student = await getCachedStudentProfileByPublicKey(publicKey);
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
    return NextResponse.json(student, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/students/[publicKey] failed:", error);
    return NextResponse.json({ error: "Failed to fetch student" }, { status: 500 });
  }
}
