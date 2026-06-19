import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 60; // Netlify Functions hard cap on most plans

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

// NEW: live presence/status API shape
interface LiveStatusItem {
  name: string;
  jdu_id: string;        // matches Student.jduId
  inside: 0 | 1;
  time_log: string | null;
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

// NEW: live presence API
const LIVE_STATUS_URL = "https://data.jdu.uz/api/students/list";

function lessonKey(
  studentId: number,
  subjectName: string,
  teacherId: string,
  groupName: string
): string {
  return `${studentId}|${subjectName}|${teacherId}|${groupName}`;
}

/**
 * Fetch with a hard timeout. If the server never responds, this throws
 * a clear "timed out" error instead of hanging forever (which would
 * otherwise silently exhaust the whole serverless function's runtime).
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  label: string,
  timeoutMs = 20000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`${label} timed out after ${timeoutMs / 1000}s (no response)`);
    }
    throw new Error(`${label} request failed: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Safely parses a fetch Response as JSON. If the body isn't valid JSON
 * (e.g. an HTML error/login page returned with a 200 status), throws a
 * clear error naming the source and showing a snippet of what came back,
 * instead of the opaque "Unexpected token '<'" parse error.
 */
async function safeJson(res: Response, label: string): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    const snippet = text.slice(0, 200).replace(/\s+/g, " ").trim();
    throw new Error(
      `${label} did not return valid JSON (status ${res.status}). Response started with: "${snippet}"`
    );
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────
// IMPORTANT: This route does the work SYNCHRONOUSLY and returns only when
// finished (or failed). It does NOT stream. Netlify Functions buffer
// responses, so a streaming approach silently breaks there — this version
// instead writes progress into SystemState.logs in the DB after each step,
// and the frontend polls GET /api/admin/seed-status to display them live.

export async function POST(_req: NextRequest) {
  const prisma = getPrisma();
  const logs: string[] = [];

  const log = async (msg: string) => {
    console.log("[seed]", msg);
    logs.push(msg);
    // Persist after every step so polling clients see progress even if
    // the function later times out or crashes.
    await prisma.systemState.update({
      where: { id: "maintenance" },
      data: { logs },
    }).catch(() => { /* best effort */ });
  };

  try {
    // ── 0. Maintenance ON + reset logs ────────────────────────────────────
    await prisma.systemState.upsert({
      where: { id: "maintenance" },
      update: { isUpdating: true, logs: [], errorMsg: null, startedAt: new Date() },
      create: { id: "maintenance", isUpdating: true, logs: [], startedAt: new Date() },
    });
    await log("🔒 Maintenance mode ON — visitors redirected…");

    // ── 1. Fetch all 4 APIs in parallel (each with its own timeout) ───────
    await log("📡 Fetching from 4 APIs in parallel (20s timeout each)…");

    const [attResult, gradeResult, creditResult, liveResult] = await Promise.allSettled([
      fetchWithTimeout(ATTENDANCE_URL, { cache: "no-store", redirect: "follow" }, "Attendance API"),
      fetchWithTimeout(GRADE_URL,      { cache: "no-store", redirect: "follow" }, "Grade API"),
      fetchWithTimeout(CREDIT_URL,     { cache: "no-store", redirect: "follow" }, "Credit API"),
      fetchWithTimeout(
        LIVE_STATUS_URL,
        {
          method: "POST",
          cache: "no-store",
          redirect: "follow",
          headers: {
            Authorization: `Bearer ${process.env.JDU_LIVE_API_TOKEN ?? ""}`,
            "Content-Type": "application/json",
          },
        },
        "Live status API (data.jdu.uz)"
      ),
    ]);

    // Report exactly which ones succeeded/failed before throwing, so the
    // log is useful even though we still abort on any single failure.
    const labels = ["Attendance API", "Grade API", "Credit API", "Live status API (data.jdu.uz)"];
    const results = [attResult, gradeResult, creditResult, liveResult];
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === "fulfilled") {
        await log(`  ✅ ${labels[i]} responded (${r.value.status})`);
      } else {
        await log(`  ❌ ${labels[i]} failed: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`);
      }
    }

    const failed = results.find((r) => r.status === "rejected");
    if (failed && failed.status === "rejected") {
      throw failed.reason instanceof Error ? failed.reason : new Error(String(failed.reason));
    }

    const attRes    = (attResult    as PromiseFulfilledResult<Response>).value;
    const gradeRes   = (gradeResult  as PromiseFulfilledResult<Response>).value;
    const creditRes  = (creditResult as PromiseFulfilledResult<Response>).value;
    const liveRes    = (liveResult   as PromiseFulfilledResult<Response>).value;

    if (!attRes.ok)    throw new Error(`Attendance API ${attRes.status}`);
    if (!gradeRes.ok)  throw new Error(`Grade API ${gradeRes.status}`);
    if (!creditRes.ok) throw new Error(`Credit API ${creditRes.status}`);
    if (!liveRes.ok)   throw new Error(`Live status API ${liveRes.status}`);

    const [attJson, gradeJson, creditJson, liveJson] = await Promise.all([
      safeJson(attRes,    "Attendance API"),
      safeJson(gradeRes,  "Grade API"),
      safeJson(creditRes, "Credit API"),
      safeJson(liveRes,   "Live status API (data.jdu.uz)"),
    ]) as [
      { data?: AttendanceItem[] },
      { data?: GradeItem[] },
      { students?: Record<string, CreditEntry> },
      { students?: LiveStatusItem[] }
    ];

    const attendanceData: AttendanceItem[]            = attJson.data       ?? [];
    const gradeData:      GradeItem[]                 = gradeJson.data     ?? [];
    const creditData:     Record<string, CreditEntry> = creditJson.students ?? {};
    const liveData:       LiveStatusItem[]            = liveJson.students  ?? [];

    await log(
      `✅ Fetched: ${attendanceData.length} attendance · ${gradeData.length} grade · ${Object.keys(creditData).length} credit · ${liveData.length} live-status rows`
    );

    // ── 2. Merge attendance + grade into one lesson map ───────────────────
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

    // ── 3. Collect teachers, groups, students ─────────────────────────────
    const teacherMap = new Map<string, string>();
    const groupSet   = new Set<string>();
    const studentMap = new Map<number, string>();

    for (const row of merged.values()) {
      teacherMap.set(row.teacher_id, row.teacher_name);
      groupSet.add(row.group_name);
      studentMap.set(row.student_id, row.student_name);
    }

    await log(
      `📦 ${teacherMap.size} teachers · ${groupSet.size} groups · ${studentMap.size} students`
    );

    // ── 4. Clean DB (keep users/sessions) ─────────────────────────────────
    await log("🗑️  Clearing old data…");
    await prisma.$transaction([
      prisma.studentCredit.deleteMany(),
      prisma.attendance.deleteMany(),
      prisma.lesson.deleteMany(),
      prisma.student.deleteMany(),
      prisma.group.deleteMany(),
      prisma.teacher.deleteMany(),
    ]);

    // ── 5. Create Teachers ─────────────────────────────────────────────────
    await log("👨‍🏫 Creating teachers…");
    await prisma.teacher.createMany({
      data: [...teacherMap.entries()].map(([id, name]) => ({ id, name })),
      skipDuplicates: true,
    });

    // ── 6. Create Groups ──────────────────────────────────────────────────
    await log("🏫 Creating groups…");
    await prisma.group.createMany({
      data: [...groupSet].map((name) => ({ name })),
      skipDuplicates: true,
    });

    const groupRows  = await prisma.group.findMany();
    const groupIdMap = new Map(groupRows.map((g) => [g.name, g.id]));

    // ── 7. Create Students ────────────────────────────────────────────────
    await log("🎓 Creating students…");
    const validStudents = [...studentMap.entries()].filter(
      ([id]) => !isNaN(id) && id > 0
    );
    const BATCH = 200;
    for (let i = 0; i < validStudents.length; i += BATCH) {
      await prisma.student.createMany({
        data: validStudents.slice(i, i + BATCH).map(([studentId, name]) => ({
          studentId,
          name,
          jduId: String(studentId),
        })),
        skipDuplicates: true,
      });
    }
    await log(`  → ${validStudents.length} students`);

    // ── 8. Create Lessons ─────────────────────────────────────────────────
    await log(`📝 Creating ${merged.size} lessons…`);
    const lessonRows = [...merged.values()].filter((row) => {
      if (isNaN(row.student_id) || row.student_id <= 0) return false;
      if (!groupIdMap.has(row.group_name)) return false;
      return true;
    });

    for (let i = 0; i < lessonRows.length; i += BATCH) {
      await prisma.lesson.createMany({
        data: lessonRows.slice(i, i + BATCH).map((row) => ({
          studentId:         row.student_id,
          teacherId:         row.teacher_id,
          groupId:           groupIdMap.get(row.group_name)!,
          subjectName:       row.subject_name,
          totalCurrentGrade: row.total_current_grade,
          totalFullGrade:    row.total_full_grade,
          percentageGrade:   row.percentage,
          assignments:       row.assignments as object,
          attendances:       row.attendances as object,
        })),
        skipDuplicates: true,
      });
      await log(`  → Lesson batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(lessonRows.length / BATCH)}`);
    }

    // ── 9. Create StudentCredits ──────────────────────────────────────────
    await log("💳 Saving student credits…");
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

    // ── 10. NEW: Live attendance status (here/exit/absent) ────────────────
    await log("📍 Saving live attendance status (here/exit)…");

    // jduId on Student is a String, matching jdu_id from the live API
    const studentsByJduId = await prisma.student.findMany({
      select: { studentId: true, jduId: true },
    });
    const jduIdToStudentId = new Map(
      studentsByJduId
        .filter((s) => s.jduId)
        .map((s) => [s.jduId as string, s.studentId])
    );

    let liveOk = 0, liveSkip = 0;
    const liveRows: { studentId: number; inside: number; timeLog: Date | null }[] = [];

    for (const item of liveData) {
      const studentId = jduIdToStudentId.get(String(item.jdu_id));
      if (!studentId) {
        liveSkip++;
        continue;
      }
      liveOk++;
      liveRows.push({
        studentId,
        inside: item.inside === 1 ? 1 : 0,
        timeLog: item.time_log ? new Date(item.time_log) : null,
      });
    }

    for (let i = 0; i < liveRows.length; i += BATCH) {
      await prisma.attendance.createMany({
        data: liveRows.slice(i, i + BATCH),
        skipDuplicates: true,
      });
    }
    await log(`  → ${liveOk} live statuses saved · ${liveSkip} skipped (no matching jdu_id)`);

    // ── 11. Maintenance OFF ────────────────────────────────────────────────
    await log("🔓 Maintenance mode OFF");
    await prisma.systemState.update({
      where: { id: "maintenance" },
      data: { isUpdating: false },
    });

    await log("🎉 Seed complete!");

    return NextResponse.json({ ok: true, logs });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[seed] Fatal:", msg);
    logs.push(`❌ Fatal: ${msg}`);

    try {
      await prisma.systemState.update({
        where: { id: "maintenance" },
        data: { isUpdating: false, errorMsg: msg, logs },
      });
    } catch { /* best effort */ }

    return NextResponse.json({ ok: false, error: msg, logs }, { status: 500 });
  }
}