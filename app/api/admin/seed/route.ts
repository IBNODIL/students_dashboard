import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { createStudentPublicKey } from "@/lib/student-public-key";
import {
  invalidateStudentsDataCache,
  invalidateLiveStatusCache,
} from "@/lib/cached-student-data";

export const runtime = "nodejs";
// Vercel function duration: Hobby plan caps at 60s, Pro plan allows up to
// 300s (5 min) on the standard tier, more with Fluid Compute.
//
// NOTE: attendance/grade/credit sources use a 120s per-attempt timeout with
// one retry (fetchWithRetry), so a consistently slow/unresponsive source can
// take up to ~240s before this route gives up on it. That exceeds the
// maxDuration below — fine for local `npm run dev` (this cap only applies
// on Vercel), but if/when this is deployed to Vercel, either raise
// maxDuration to 300 (Pro plan) or reduce the per-attempt timeout so
// timeout + retry stays under whatever maxDuration you set. Keep this value
// in sync with the "functions" entry for this route in vercel.json.
export const maxDuration = 120;

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

function lessonKey(
  studentId: number,
  subjectName: string,
  teacherId: string,
  groupName: string
): string {
  return `${studentId}|${subjectName}|${teacherId}|${groupName}`;
}

/** External sheets occasionally return numeric IDs in text columns. */
function asText(value: unknown): string {
  return String(value ?? "").trim();
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
 * Retries fetchWithTimeout once if the first attempt times out or fails.
 * Google Apps Script web apps occasionally have a slow cold start — a
 * single retry after the first timeout is usually enough to get through,
 * since the script is "warm" by the second attempt.
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  label: string,
  timeoutMs: number,
  onRetryLog?: (msg: string) => Promise<void>
): Promise<Response> {
  try {
    return await fetchWithTimeout(url, options, label, timeoutMs);
  } catch (firstErr) {
    if (onRetryLog) {
      await onRetryLog(
        `  ⚠️ ${label} failed once (${firstErr instanceof Error ? firstErr.message : String(firstErr)}) — retrying…`
      );
    }
    return await fetchWithTimeout(url, options, label, timeoutMs);
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

export async function POST() {
  const prisma = getPrisma();

  // Guard against overlapping runs. Without this, two concurrent requests
  // both delete + rebuild the same tables; whichever is still writing when
  // the other's deleteMany() fires gets a foreign key violation on rows
  // that were just deleted out from under it. The client-side "seeding"
  // button state only protects a single tab — it does nothing for a second
  // tab, a second admin, or an impatient retry while the first request
  // (which can legitimately take a couple of minutes) is still running.
  const STALE_LOCK_MS = 10 * 60 * 1000; // 10 minutes
  const existingState = await prisma.systemState.findUnique({ where: { id: "maintenance" } });
  if (existingState?.isUpdating) {
    const startedAt = existingState.startedAt ? new Date(existingState.startedAt).getTime() : 0;
    const isStale = !startedAt || Date.now() - startedAt > STALE_LOCK_MS;
    if (!isStale) {
      return NextResponse.json(
        { ok: false, error: "A data refresh is already in progress. Please wait for it to finish." },
        { status: 409 }
      );
    }
    // Lock is older than 10 minutes — most likely a previous run's process
    // was killed before it could reach its own cleanup (catch/finally)
    // block, leaving isUpdating stuck true forever. Reclaim it rather than
    // lock the app out of refreshing permanently.
    console.warn("[seed] Found an isUpdating lock older than 10 minutes — treating it as stale and proceeding.");
  }

  const logs: string[] = [];

  const log = async (msg: string) => {
    console.log("[seed]", msg);
    logs.push(msg);

    await prisma.systemState
      .update({
        where: { id: "maintenance" },
        data: { logs },
      })
      .catch(() => {});
  };

  try {
    const seedSources = await prisma.seedSource.findMany({
      where: {
        active: true,
      },
    }) as Array<{ id: string; type: string; url: string; name: string; active: boolean }>;

    const ATTENDANCE_URLS = [...new Set(seedSources
      .filter((s) => s.type === "ATTENDANCE")
      .map((s) => s.url.trim())
      .filter(Boolean))];

    const GRADE_URLS = [...new Set(seedSources
      .filter((s) => s.type === "GRADES")
      .map((s) => s.url.trim())
      .filter(Boolean))];

    const CREDIT_URL = seedSources.find(
      (s) => s.type === "CREDITS"
    )?.url;

    const LIVE_STATUS_URL = seedSources.find(
      (s) => s.type === "LIVE_STATUS"
    )?.url;

    if (!CREDIT_URL) {
      throw new Error("Credit API URL not configured.");
    }

    if (!LIVE_STATUS_URL) {
      throw new Error("Live Status API URL not configured.");
    }

    if (ATTENDANCE_URLS.length === 0) {
      throw new Error("No Attendance API URLs configured.");
    }

    if (GRADE_URLS.length === 0) {
      throw new Error("No Grade API URLs configured.");
    }

    // ── 0. Maintenance ON + reset logs ────────────────────────────────────
    await prisma.systemState.upsert({
      where: { id: "maintenance" },
      update: { isUpdating: true, logs: [], errorMsg: null, startedAt: new Date() },
      create: { id: "maintenance", isUpdating: true, logs: [], startedAt: new Date() },
    });
    await log("🔒 Maintenance mode ON — visitors redirected…");

    // ── 1. Fetch all sources in parallel (each with its own timeout) ──────
    // Google Apps Script web apps can be slow to "wake up" and serialize
    // large datasets, so attendance/grade get a longer timeout than the
    // faster credit/live-status APIs.
    await log(
      `📡 Fetching from ${ATTENDANCE_URLS.length +
      GRADE_URLS.length +
      2
      } APIs in parallel…`
    );

    const attendanceRequests = ATTENDANCE_URLS.map((url, index) =>
      fetchWithRetry(url, { cache: "no-store", redirect: "follow" }, `Attendance API ${index + 1}`, 120000, log)
    );
    const gradeRequests = GRADE_URLS.map((url, index) =>
      fetchWithRetry(url, { cache: "no-store", redirect: "follow" }, `Grade API ${index + 1}`, 120000, log)
    );

    const results = await Promise.allSettled([
      ...attendanceRequests,
      ...gradeRequests,
      fetchWithRetry(CREDIT_URL, { cache: "no-store", redirect: "follow" }, "Credit API", 120000, log),
      fetchWithRetry(
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
        "Live status API (data.jdu.uz)",
        20000,
        log
      ),
    ]);

    // Report exactly which ones succeeded/failed before throwing, so the
    // log is useful even though we still abort on any single failure.
    const labels = [
      ...ATTENDANCE_URLS.map((_, index) => `Attendance API ${index + 1}`),
      ...GRADE_URLS.map((_, index) => `Grade API ${index + 1}`),
      "Credit API",
      "Live status API (data.jdu.uz)",
    ];
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

    const responses = results.map((result, index) => {
      if (result.status !== "fulfilled") {
        throw new Error(`${labels[index]} did not return a response`);
      }
      if (!result.value.ok) {
        throw new Error(`${labels[index]} ${result.value.status}`);
      }
      return result.value;
    });

    const attendanceResponses = responses.slice(0, ATTENDANCE_URLS.length);
    const gradeResponses = responses.slice(
      ATTENDANCE_URLS.length,
      ATTENDANCE_URLS.length + GRADE_URLS.length
    );
    const creditRes = responses[ATTENDANCE_URLS.length + GRADE_URLS.length];
    const liveRes = responses[ATTENDANCE_URLS.length + GRADE_URLS.length + 1];

    if (!creditRes.ok) throw new Error(`Credit API ${creditRes.status}`);
    if (!liveRes.ok) throw new Error(`Live status API ${liveRes.status}`);

    const [attendanceJsons, gradeJsons, creditJson, liveJson] = await Promise.all([
      Promise.all(attendanceResponses.map((response, index) => safeJson(response, `Attendance API ${index + 1}`))),
      Promise.all(gradeResponses.map((response, index) => safeJson(response, `Grade API ${index + 1}`))),
      safeJson(creditRes, "Credit API"),
      safeJson(liveRes, "Live status API (data.jdu.uz)"),
    ]) as [
        { data?: AttendanceItem[] }[],
        { data?: GradeItem[] }[],
        { students?: Record<string, CreditEntry> },
        { students?: LiveStatusItem[] }
      ];

    const attendanceData: AttendanceItem[] = attendanceJsons.flatMap((json) => json.data ?? []);
    const gradeData: GradeItem[] = gradeJsons.flatMap((json) => json.data ?? []);
    const creditData: Record<string, CreditEntry> = creditJson.students ?? {};
    const liveData: LiveStatusItem[] = liveJson.students ?? [];

    await log(
      `✅ Fetched: ${attendanceData.length} attendance · ${gradeData.length} grade · ${Object.keys(creditData).length} credit · ${liveData.length} live-status rows`
    );

    // ── 2. Merge attendance + grade into one lesson map ───────────────────
    await log("🔀 Merging attendance + grade data…");

    const merged = new Map<string, MergedLesson>();

    for (const row of attendanceData) {
      const id = Number(row.student_id);
      if (isNaN(id)) continue;
      const studentName = asText(row.student_name);
      const groupName = asText(row.group_name);
      const subjectName = asText(row.subject_name);
      const teacherName = asText(row.teacher_name);
      const teacherId = asText(row.teacher_id);
      const key = lessonKey(id, subjectName, teacherId, groupName);
      if (!merged.has(key)) {
        merged.set(key, {
          student_id: id,
          student_name: studentName,
          group_name: groupName,
          subject_name: subjectName,
          teacher_name: teacherName,
          teacher_id: teacherId,
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
      const studentName = asText(row.student_name);
      const groupName = asText(row.group_name);
      const subjectName = asText(row.subject_name);
      const teacherName = asText(row.teacher_name);
      const teacherId = asText(row.teacher_id);
      const key = lessonKey(id, subjectName, teacherId, groupName);
      if (!merged.has(key)) {
        merged.set(key, {
          student_id: id,
          student_name: studentName,
          group_name: groupName,
          subject_name: subjectName,
          teacher_name: teacherName,
          teacher_id: teacherId,
          attendances: [],
          total_current_grade: row.total_current_grade ?? 0,
          total_full_grade: row.total_full_grade ?? 0,
          percentage: row.percentage ?? 0,
          assignments: row.assignments ?? [],
        });
      } else {
        const prev = merged.get(key)!;
        prev.total_current_grade = row.total_current_grade ?? prev.total_current_grade;
        prev.total_full_grade = row.total_full_grade ?? prev.total_full_grade;
        prev.percentage = row.percentage ?? prev.percentage;
        prev.assignments = [...prev.assignments, ...(row.assignments ?? [])];
      }
    }

    await log(`  → ${merged.size} unique lessons`);

    // ── 3. Collect teachers, groups, students ─────────────────────────────
    const teacherMap = new Map<string, string>();
    const groupSet = new Set<string>();
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
    // Student rows are recreated on every seed. Preserve manually entered
    // phone numbers so parent contact data is not lost during refresh.
    const existingStudentContact = new Map(
      (await prisma.student.findMany({
        select: { studentId: true, phone: true },
      }) as Array<{ studentId: number; phone: string | null }>).map((s) => [s.studentId, s.phone] as const)
    );

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

    const groupRows = await prisma.group.findMany() as Array<{ id: number; name: string }>;
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
          phone: existingStudentContact.get(studentId) ?? null,
          publicKey: createStudentPublicKey(
            studentId,
            existingStudentContact.get(studentId) ?? null,
          ),
        })),
        // No skipDuplicates: the table was fully wiped above, so a conflict
        // here (e.g. a public_key collision) is a genuine bug that should
        // surface immediately with a clear constraint error, rather than
        // being silently dropped and only showing up later as a confusing
        // "foreign key violated" error during lesson creation.
      });
    }
    await log(`  → ${validStudents.length} students`);

    // Verify against the DB, not just our in-memory assumption, in case any
    // row still failed to insert for a reason that doesn't throw (defense
    // in depth — lesson creation below only proceeds for students that are
    // actually present).
    const createdStudentIds = new Set(
      (await prisma.student.findMany({ select: { studentId: true } }) as Array<{ studentId: number }>).map((s) => s.studentId)
    );
    if (createdStudentIds.size !== validStudents.length) {
      await log(
        `  ⚠️ Expected ${validStudents.length} students but found ${createdStudentIds.size} in the database after creation.`
      );
    }

    // ── 8. Create Lessons ─────────────────────────────────────────────────
    await log(`📝 Creating ${merged.size} lessons…`);
    const lessonRows = [...merged.values()].filter((row) => {
      if (isNaN(row.student_id) || row.student_id <= 0) return false;
      if (!groupIdMap.has(row.group_name)) return false;
      if (!createdStudentIds.has(row.student_id)) return false;
      return true;
    });
    const skippedLessons = merged.size - lessonRows.length;
    if (skippedLessons > 0) {
      await log(`  ⚠️ Skipping ${skippedLessons} lesson(s) referencing a student that wasn't created.`);
    }

    for (let i = 0; i < lessonRows.length; i += BATCH) {
      await prisma.lesson.createMany({
        data: lessonRows.slice(i, i + BATCH).map((row) => ({
          studentId: row.student_id,
          teacherId: row.teacher_id,
          groupId: groupIdMap.get(row.group_name)!,
          subjectName: row.subject_name,
          totalCurrentGrade: row.total_current_grade,
          totalFullGrade: row.total_full_grade,
          percentageGrade: row.percentage,
          assignments: row.assignments as object,
          attendances: row.attendances as object,
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
        return !isNaN(id) && createdStudentIds.has(id);
      });
      creditSkip += chunk.length - valid.length;
      creditOk += valid.length;

      if (valid.length > 0) {
        await prisma.studentCredit.createMany({
          data: valid.map(([idStr, entry]) => ({
            studentId: Number(idStr),
            grades: entry.grades as object,
            totals: entry.totals as object,
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
    }) as Array<{ studentId: number; jduId: string | null }>;
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
    invalidateStudentsDataCache();
    invalidateLiveStatusCache();
    await log("Student dashboard cache invalidated.");

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
