import { NextRequest, NextResponse } from "next/server";
import type { FlatRecord } from "@/lib/types";
import {
  buildStatsFromFlatRecords,
  getFlatRecordsFromDb,
} from "@/lib/student-data";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const name = sp.get("name")?.trim() ?? "";
  const group = sp.get("group")?.trim() ?? "";
  const studentId = sp.get("studentId")?.trim() ?? "";
  const subject = sp.get("subject")?.trim() ?? "";
  const teacher = sp.get("teacher")?.trim() ?? "";
  const teacherId = sp.get("teacherId")?.trim() ?? "";
  const date = sp.get("date")?.trim() ?? "";
  const room = sp.get("room")?.trim() ?? "";
  const lessonTime = sp.get("lessonTime")?.trim() ?? "";
  const status = sp.get("status")?.trim() ?? "";
  const page = Math.max(1, parseInt(sp.get("page") ?? "1"));
  const limit = Math.min(200, Math.max(1, parseInt(sp.get("limit") ?? "50")));

  let records = await getFlatRecordsFromDb();

  if (name) {
    const lower = name.toLowerCase();
    records = records.filter((r) =>
      r.student_name.toLowerCase().includes(lower)
    );
  }
  if (group) {
    const lower = group.toLowerCase();
    records = records.filter((r) =>
      r.group_name.toLowerCase().includes(lower)
    );
  }
  if (studentId) {
    records = records.filter((r) =>
      String(r.student_id).includes(studentId)
    );
  }
  if (subject) {
    const lower = subject.toLowerCase();
    records = records.filter((r) =>
      r.subject_name.toLowerCase().includes(lower)
    );
  }
  if (teacher) {
    const lower = teacher.toLowerCase();
    records = records.filter((r) =>
      r.teacher_name.toLowerCase().includes(lower)
    );
  }
  if (teacherId) {
    const lower = teacherId.toLowerCase();
    records = records.filter((r) =>
      r.teacher_id.toLowerCase().includes(lower)
    );
  }
  if (date) {
    records = records.filter((r) => r.date.startsWith(date));
  }
  if (room) {
    records = records.filter((r) => String(r.lesson_room).includes(room));
  }
  if (lessonTime) {
    records = records.filter((r) => String(r.lesson_time) === lessonTime);
  }
  if (status && status !== "all") {
    records = records.filter((r) => r.status === status);
  }

  const stats = buildStatsFromFlatRecords(records);
  const total = records.length;
  const total_pages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paginated = records.slice(start, start + limit);

  return NextResponse.json({
    records: paginated,
    stats,
    total,
    page,
    limit,
    total_pages,
  });
}
