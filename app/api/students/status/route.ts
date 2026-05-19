import { getPrisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const prisma = getPrisma();
    // Get all students with their latest attendance record
    const students = await prisma.student.findMany({
      select: {
        studentId: true,
        name: true,
        jduId: true,
        attendances: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Map students to include their status
    const studentsWithStatus = students.map((student: typeof students[number]) => {
      const attendance = student.attendances[0];
      
      let status = "do not come";
      
      if (attendance) {
        if (attendance.inside === 1) {
          status = "here";
        } else if (attendance.inside === 0 && attendance.timeLog) {
          status = "exit";
        } else if (attendance.inside === 0 && !attendance.timeLog) {
          status = "do not come";
        }
      }

      return {
        studentId: student.studentId,
        name: student.name,
        jduId: student.jduId,
        status,
        inside: attendance?.inside ?? null,
        timeLog: attendance?.timeLog ?? null,
        lastUpdated: attendance?.createdAt ?? null,
      };
    });

    // Summary stats
    const stats = {
      total: studentsWithStatus.length,
      here: studentsWithStatus.filter((s: typeof studentsWithStatus[number]) => s.status === "here").length,
      exit: studentsWithStatus.filter((s: typeof studentsWithStatus[number]) => s.status === "exit").length,
      doNotCome: studentsWithStatus.filter(
        (s: typeof studentsWithStatus[number]) => s.status === "do not come"
      ).length,
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats,
      students: studentsWithStatus,
    });
  } catch (error) {
    console.error("Error fetching students status:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch students status",
      },
      { status: 500 }
    );
  }
}
