import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AttendanceItem {
  student_id: number | string;
  student_name: string;
  group_name: string;
  subject_name: string;
  teacher_name: string;
  teacher_id: string;
  attendances: {
    date: string;
    lesson_time: number;
    lesson_room: number;
    status: string;
  }[];
}

interface GradeItem {
  student_id: number | string;
  student_name: string;
  group_name: string;
  subject_name: string;
  teacher_name: string;
  teacher_id: string;
  total_current_grade: number;
  total_full_grade: number;
  percentage: number;
  assignments: unknown[];
}

interface CreditEntry {
  grades: Record<string, Record<string, string>>;
  totals: {
    total_credits_passed: number;
    total_credits_graded: number;
    percentage_passed: number;
  };
  by_department: Record<string, {
    total_credits_passed: number;
    total_credits_graded: number;
    percentage_passed: number;
  }>;
}

interface MergedLesson {
  student_id: number;
  student_name: string;
  group_name: string;
  subject_name: string;
  teacher_name: string;
  teacher_id: string;
  attendances: unknown[];
  total_current_grade: number;
  total_full_grade: number;
  percentage: number;
  assignments: unknown[];
}

// ── API URLs ──────────────────────────────────────────────────────────────────

const ATTENDANCE_URL =
  "https://script.google.com/macros/s/AKfycbzlltqBGhHfd08U9T6wKd3VDDneM3CS2PyXA3l0Os45XhJStCM-w1LX9ucbwlZfOM2atg/exec";

const GRADE_URL =
  "https://script.google.com/macros/s/AKfycbwavH4iN1Esu7FSefEiOp2-64IW9oQV1vjxtBuil_XJ5AIAxhfpmEgdgwHHZRUCGNu2Ng/exec";

const CREDIT_URL =
  "https://script.google.com/macros/s/AKfycbz9zY9b8vNAIcMs3BjjxPj4B8idqMlLyxASMQTTc5t3qLhF65_NtgrrmGLSF5GYs_Xxsw/exec";

// ── SSE helpers ───────────────────────────────────────────────────────────────

function enc(obj: object): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(obj)}\n\n`);
}

function lessonKey(
  studentId: number,
  subjectName: string,
  teacherId: string,
  groupName: string
): string {
  return `${studentId}|${subjectName}|${teacherId}|${groupName}`;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(_req: NextRequest) {
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  const log = async (msg: string) => {
    console.log("[seed]", msg);
    await writer.write(enc({ log: msg }));
  };

  (async () => {
    const prisma = getPrisma();

    try {
      // ── 0. Maintenance ON ────────────────────────────────────────────────
      await log("🔒 Maintenance mode ON — visitors redirected…");
      await prisma.systemState.upsert({
        where: { id: "maintenance" },
        update: { isUpdating: true },
        create: { id: "maintenance", isUpdating: true },
      });

      // ── 1. Fetch 3 APIs in parallel ──────────────────────────────────────
      await log("📡 Fetching from 3 APIs in parallel…");
      const [attRes, gradeRes, creditRes] = await Promise.all([
        fetch(ATTENDANCE_URL, { cache: "no-store", redirect: "follow" }),
        fetch(GRADE_URL,       { cache: "no-store", redirect: "follow" }),
        fetch(CREDIT_URL,      { cache: "no-store", redirect: "follow" }),
      ]);

      if (!attRes.ok)    throw new Error(`Attendance API ${attRes.status}`);
      if (!gradeRes.ok)  throw new Error(`Grade API ${gradeRes.status}`);
      if (!creditRes.ok) throw new Error(`Credit API ${creditRes.status}`);

      const [attJson, gradeJson, creditJson] = await Promise.all([
        attRes.json(),
        gradeRes.json(),
        creditRes.json(),
      ]);

      const attendanceData: AttendanceItem[]             = attJson.data    ?? [];
      const gradeData:      GradeItem[]                  = gradeJson.data  ?? [];
      const creditData:     Record<string, CreditEntry>  = creditJson.students ?? {};

      await log(
        `✅ Fetched: ${attendanceData.length} attendance rows · ${gradeData.length} grade rows · ${Object.keys(creditData).length} credit entries`
      );

      // ── 2. Merge attendance + grade into one lesson map ──────────────────
      await log("🔀 Merging attendance + grade data…");

      const merged = new Map<string, MergedLesson>();

      for (const row of attendanceData) {
        const id = Number(row.student_id);
        if (isNaN(id)) continue;
        const key = lessonKey(id, row.subject_name, row.teacher_id, row.group_name);
        if (!merged.has(key)) {
          merged.set(key, {
            student_id: id,
            student_name: row.student_name,
            group_name: row.group_name,
            subject_name: row.subject_name,
            teacher_name: row.teacher_name,
            teacher_id: row.teacher_id,
            attendances: row.attendances ?? [],
            total_current_grade: 0,
            total_full_grade: 0,
            percentage: 0,
            assignments: [],
          });
        } else {
          const prev = merged.get(key)!;
          prev.attendances = [...prev.attendances, ...(row.attendances ?? [])];
        }
      }

      for (const row of gradeData) {
        const id = Number(row.student_id);
        if (isNaN(id)) continue;
        const key = lessonKey(id, row.subject_name, row.teacher_id, row.group_name);
        if (!merged.has(key)) {
          merged.set(key, {
            student_id: id,
            student_name: row.student_name,
            group_name: row.group_name,
            subject_name: row.subject_name,
            teacher_name: row.teacher_name,
            teacher_id: row.teacher_id,
            attendances: [],
            total_current_grade: row.total_current_grade ?? 0,
            total_full_grade:    row.total_full_grade    ?? 0,
            percentage:          row.percentage          ?? 0,
            assignments:         row.assignments         ?? [],
          });
        } else {
          const prev = merged.get(key)!;
          prev.total_current_grade = row.total_current_grade ?? prev.total_current_grade;
          prev.total_full_grade    = row.total_full_grade    ?? prev.total_full_grade;
          prev.percentage          = row.percentage          ?? prev.percentage;
          prev.assignments         = [...prev.assignments, ...(row.assignments ?? [])];
        }
      }

      await log(`  → ${merged.size} unique lessons`);

      // ── 3. Collect teachers, groups, students ────────────────────────────
      const teacherMap = new Map<string, string>(); // teacherId → name
      const groupSet   = new Set<string>();
      const studentMap = new Map<number, string>(); // studentId → name

      for (const row of merged.values()) {
        teacherMap.set(row.teacher_id, row.teacher_name);
        groupSet.add(row.group_name);
        studentMap.set(row.student_id, row.student_name);
      }

      await log(
        `📦 ${teacherMap.size} teachers · ${groupSet.size} groups · ${studentMap.size} students`
      );

      // ── 4. Clean DB (keep users/sessions) ───────────────────────────────
      await log("🗑️  Clearing old data…");
      await prisma.$transaction([
        prisma.studentCredit.deleteMany(),
        prisma.attendance.deleteMany(),
        prisma.lesson.deleteMany(),
        prisma.student.deleteMany(),
        prisma.group.deleteMany(),
        prisma.teacher.deleteMany(),
      ]);

      // ── 5. Create Teachers ───────────────────────────────────────────────
      await log("👨‍🏫 Creating teachers…");
      await prisma.teacher.createMany({
        data: [...teacherMap.entries()].map(([id, name]) => ({ id, name })),
        skipDuplicates: true,
      });

      // ── 6. Create Groups ─────────────────────────────────────────────────
      await log("🏫 Creating groups…");
      await prisma.group.createMany({
        data: [...groupSet].map((name) => ({ name })),
        skipDuplicates: true,
      });

      const groupRows  = await prisma.group.findMany();
      const groupIdMap = new Map(groupRows.map((g) => [g.name, g.id]));

      // ── 7. Create Students ───────────────────────────────────────────────
      await log("🎓 Creating students…");
      const validStudents = [...studentMap.entries()].filter(
        ([id]) => !isNaN(id) && id > 0
      );
      const BATCH = 200;
      for (let i = 0; i < validStudents.length; i += BATCH) {
        await prisma.student.createMany({
          data: validStudents.slice(i, i + BATCH).map(([studentId, name]) => ({
            studentId,          // already Number — Prisma gets Int ✓
            name,
            jduId: String(studentId),
          })),
          skipDuplicates: true,
        });
      }
      await log(`  → ${validStudents.length} students`);

      // ── 8. Create Lessons ────────────────────────────────────────────────
      await log(`📝 Creating ${merged.size} lessons…`);
      const lessonRows = [...merged.values()].filter((row) => {
        if (isNaN(row.student_id) || row.student_id <= 0) return false;
        if (!groupIdMap.has(row.group_name)) return false;
        return true;
      });

      for (let i = 0; i < lessonRows.length; i += BATCH) {
        await prisma.lesson.createMany({
          data: lessonRows.slice(i, i + BATCH).map((row) => ({
            studentId:          row.student_id,
            teacherId:          row.teacher_id,
            groupId:            groupIdMap.get(row.group_name)!,
            subjectName:        row.subject_name,
            totalCurrentGrade:  row.total_current_grade,
            totalFullGrade:     row.total_full_grade,
            percentageGrade:    row.percentage,
            assignments:        row.assignments  as object,
            attendances:        row.attendances  as object,
          })),
          skipDuplicates: true,
        });
        await log(
          `  → Batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(lessonRows.length / BATCH)}`
        );
      }

      // ── 9. Create StudentCredits ─────────────────────────────────────────
      await log("💳 Upserting student credits…");
      let creditOk = 0, creditSkip = 0;
      const creditEntries = Object.entries(creditData);

      for (let i = 0; i < creditEntries.length; i += BATCH) {
        const chunk = creditEntries.slice(i, i + BATCH);
        const valid = chunk.filter(([idStr]) => {
          const id = Number(idStr);
          return !isNaN(id) && studentMap.has(id);
        });
        creditSkip += chunk.length - valid.length;
        creditOk   += valid.length;

        if (valid.length > 0) {
          await prisma.studentCredit.createMany({
            data: valid.map(([idStr, entry]) => ({
              studentId:    Number(idStr),
              grades:       entry.grades        as object,
              totals:       entry.totals        as object,
              byDepartment: entry.by_department as object,
            })),
            skipDuplicates: true,
          });
        }
      }
      await log(`  → ${creditOk} credits saved · ${creditSkip} skipped`);

      // ── 10. Maintenance OFF ──────────────────────────────────────────────
      await log("🔓 Maintenance mode OFF");
      await prisma.systemState.update({
        where: { id: "maintenance" },
        data:  { isUpdating: false },
      });

      await log("🎉 Seed complete!");
      await writer.write(enc({ done: true }));

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[seed] Fatal:", msg);
      await writer.write(enc({ error: msg }));
      try {
        await prisma.systemState.update({
          where: { id: "maintenance" },
          data:  { isUpdating: false },
        });
      } catch { /* ignore */ }
    } finally {
      await writer.close();
    }
  })();

  return new NextResponse(readable as unknown as BodyInit, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection":    "keep-alive",
    },
  });
}