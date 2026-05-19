import { NextRequest, NextResponse } from "next/server";
import {
  buildStatsFromProfiles,
  filterToGroupedProfiles,
  loadRawStudentsForAggregation,
  type GroupedQueryFilters,
} from "@/lib/student-data";
import { getPrisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const filters: GroupedQueryFilters = {
    name: sp.get("name")?.trim() ?? "",
    group: sp.get("group")?.trim() ?? "",
    studentId: sp.get("studentId")?.trim() ?? "",
    subject: sp.get("subject")?.trim() ?? "",
    teacher: sp.get("teacher")?.trim() ?? "",
    teacherId: sp.get("teacherId")?.trim() ?? "",
    date: sp.get("date")?.trim() ?? "",
    room: sp.get("room")?.trim() ?? "",
    lessonTime: sp.get("lessonTime")?.trim() ?? "",
    status: sp.get("status")?.trim() ?? "",
  };

  const page = Math.max(1, parseInt(sp.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") ?? "20")));

  const rawStudents = await loadRawStudentsForAggregation();

  const result = filterToGroupedProfiles(rawStudents, filters);

  const stats = buildStatsFromProfiles(result);
  const total = result.length;
  const total_pages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paginated = result.slice(start, start + limit);

  // Fetch real-time attendance status for paginated students
  const prisma = getPrisma();
  const studentIds = paginated.map((s) => s.student_id);
  const attendanceRecords = await prisma.attendance.findMany({
    where: { studentId: { in: studentIds } },
    orderBy: { createdAt: "desc" },
    distinct: ["studentId"],
  });

  const attendanceMap = new Map(
    attendanceRecords.map((a: typeof attendanceRecords[number]) => [
      a.studentId,
      {
        status:
          a.inside === 1
            ? ("here" as const)
            : a.inside === 0 && a.timeLog
            ? ("exit" as const)
            : ("do not come" as const),
        inside: a.inside,
        timeLog: a.timeLog?.toISOString() ?? null,
        lastUpdated: a.createdAt.toISOString(),
      },
    ])
  );

  const studentsWithStatus = paginated.map((s) => ({
    ...s,
    attendanceStatus: attendanceMap.get(s.student_id),
  }));

  return NextResponse.json({
    students: studentsWithStatus,
    stats,
    total,
    page,
    limit,
    total_pages,
  });
}
