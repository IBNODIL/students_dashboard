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

  const prisma = getPrisma();
  
  // Get ALL students' attendance statuses first
  const allAttendanceRecords = await prisma.attendance.findMany({
    orderBy: { createdAt: "desc" },
    distinct: ["studentId"],
  });

  const studentStatusMap = new Map<
    number,
    {
      status: "here" | "exit" | "do not come";
      inside: number | null;
      timeLog: string | null;
      lastUpdated: string | null;
    }
  >();

  for (const attendance of allAttendanceRecords) {
    studentStatusMap.set(attendance.studentId, {
      status:
        attendance.inside === 1
          ? ("here" as const)
          : attendance.inside === 0 && attendance.timeLog
          ? ("exit" as const)
          : ("do not come" as const),
      inside: attendance.inside,
      timeLog: attendance.timeLog?.toISOString() ?? null,
      lastUpdated: attendance.createdAt.toISOString(),
    });
  }

  const normalizeFilterStatus = (status: string) => {
    if (status === "present") return "here";
    if (status === "exit") return "exit";
    if (status === "absent") return "do not come";
    return "";
  };

  const requestedStatus = normalizeFilterStatus(filters.status);

  // Filter students by their attendance status BEFORE applying course filters
  const studentIdsWithStatus = Array.from(studentStatusMap.entries())
    .filter(([_, attendance]) => {
      if (!requestedStatus) return true;
      return attendance.status === requestedStatus;
    })
    .map(([id]) => id);

  // Create a modified filters object that doesn't include status
  const filtersWithoutStatus = { ...filters, status: "" };

  // Apply course-level filters
  const result = filterToGroupedProfiles(rawStudents, filtersWithoutStatus);

  // Further filter by student IDs that match the status filter
  const statusFilteredResult = requestedStatus
    ? result.filter((student) => studentIdsWithStatus.includes(student.student_id))
    : result;

  const studentStatusSummary = statusFilteredResult.reduce(
    (summary, student) => {
      const attendance = studentStatusMap.get(student.student_id);
      const currentStatus = attendance?.status ?? "do not come";
      summary.total += 1;
      if (currentStatus === "here") summary.present += 1;
      else if (currentStatus === "exit") summary.exit += 1;
      else summary.absent += 1;
      return summary;
    },
    { present: 0, absent: 0, exit: 0, total: 0 }
  );

  const nameOptions = new Set<string>();
  const studentIdOptions = new Set<string>();
  const groupOptions = new Set<string>();
  const subjectOptions = new Set<string>();
  const teacherOptions = new Set<string>();
  const teacherIdOptions = new Set<string>();
  const roomOptions = new Set<string>();

  statusFilteredResult.forEach((student) => {
    nameOptions.add(student.student_name);
    studentIdOptions.add(String(student.student_id));
    if (student.group_name) groupOptions.add(student.group_name);

    student.courses.forEach((course) => {
      if (course.subject_name) subjectOptions.add(course.subject_name);
      if (course.teacher_name) teacherOptions.add(course.teacher_name);
      if (course.teacher_id) teacherIdOptions.add(course.teacher_id);
      course.attendances.forEach((attendance) => {
        if (attendance.lesson_room !== undefined && attendance.lesson_room !== null) {
          roomOptions.add(String(attendance.lesson_room));
        }
      });
    });
  });

  const stats = buildStatsFromProfiles(statusFilteredResult);
  const total = statusFilteredResult.length;
  const total_pages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paginated = statusFilteredResult.slice(start, start + limit);

  const studentsWithStatus = paginated.map((s) => ({
    ...s,
    attendanceStatus: studentStatusMap.get(s.student_id),
  }));

  return NextResponse.json({
    students: studentsWithStatus,
    stats,
    studentStatusSummary,
    filterOptions: {
      nameOptions: Array.from(nameOptions).sort((a, b) => a.localeCompare(b)),
      studentIdOptions: Array.from(studentIdOptions).sort((a, b) => a.localeCompare(b)),
      groupOptions: Array.from(groupOptions).sort((a, b) => a.localeCompare(b)),
      subjectOptions: Array.from(subjectOptions).sort((a, b) => a.localeCompare(b)),
      teacherOptions: Array.from(teacherOptions).sort((a, b) => a.localeCompare(b)),
      teacherIdOptions: Array.from(teacherIdOptions).sort((a, b) => a.localeCompare(b)),
      roomOptions: Array.from(roomOptions).sort((a, b) => a.localeCompare(b)),
    },
    total,
    page,
    limit,
    total_pages,
  });
}
