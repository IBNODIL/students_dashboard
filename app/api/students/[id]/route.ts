import { NextRequest, NextResponse } from "next/server";
import { getStudentProfileFromDb } from "@/lib/student-data";
import { getPrisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const studentId = parseInt(id, 10);

    if (isNaN(studentId)) {
      return NextResponse.json(
        { error: "Invalid student ID" },
        { status: 400 }
      );
    }

    const profile = await getStudentProfileFromDb(studentId);
    if (!profile) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    const prisma = getPrisma();
    const latestAttendance = await prisma.attendance.findFirst({
      where: { studentId },
      orderBy: { createdAt: "desc" },
    });

    const attendanceStatus = latestAttendance
      ? {
          status:
            latestAttendance.inside === 1
              ? ("here" as const)
              : latestAttendance.inside === 0 && latestAttendance.timeLog
              ? ("exit" as const)
              : ("do not come" as const),
          inside: latestAttendance.inside,
          timeLog: latestAttendance.timeLog?.toISOString() ?? null,
          lastUpdated: latestAttendance.createdAt.toISOString(),
        }
      : undefined;

    return NextResponse.json({
      ...profile,
      attendanceStatus,
    });
  } catch (error) {
    console.error("Error fetching student:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
