import type { Student, StudentWithCourses } from "@/lib/types";
import { getPrisma } from "@/lib/prisma";
import { parseJsonAttendances, buildAllProfilesFromAttendance, parseCreditData } from "@/lib/student-data";

export const STUDENTS_DATA_CACHE_TAG = "students-data";
export const STUDENT_LIVE_STATUS_CACHE_TAG = "students-live-status";

const LESSONS_TTL_MS = 120_000;
const LIVE_ATTENDANCE_TTL_MS = 15_000;

// Explicit shape interfaces — the bundled Prisma client stub types PrismaClient
// as `any`, which causes all query results to be `any` too, losing type safety.
// These mirror the schema exactly so TypeScript can check our cache/mapping code.
interface LessonWithRelations {
  id: string;
  studentId: number;
  teacherId: string;
  groupId: number;
  subjectName: string;
  totalCurrentGrade: number;
  totalFullGrade: number;
  percentageGrade: number;
  assignments: unknown;
  attendances: unknown;
  student: { studentId: number; name: string; publicKey: string | null; phone: string | null };
  group: { id: number; name: string };
  teacher: { id: string; name: string };
}

interface AttendanceRow {
  id: string;
  studentId: number;
  inside: number;
  timeLog: Date | null;
  createdAt: Date;
}

interface CreditRow {
  id: string;
  studentId: number;
  grades: unknown;
  totals: unknown;
  byDepartment: unknown;
}

type LessonsResult = LessonWithRelations[];
type LiveAttendanceResult = AttendanceRow[];
type CreditsResult = CreditRow[];

async function fetchLessons(): Promise<LessonsResult> {
  return getPrisma().lesson.findMany({
    include: { student: true, group: true, teacher: true },
  }) as Promise<LessonsResult>;
}

async function fetchLiveAttendance(): Promise<LiveAttendanceResult> {
  return getPrisma().attendance.findMany({
    orderBy: { createdAt: "desc" },
    distinct: ["studentId"],
  }) as Promise<LiveAttendanceResult>;
}

async function fetchCredits(): Promise<CreditsResult> {
  return getPrisma().studentCredit.findMany() as Promise<CreditsResult>;
}

// Plain in-memory cache (module-scoped singleton). Unlike unstable_cache, this
// keeps real Date objects (no JSON round-trip) and has no 2MB size limit, so
// it works for this dataset where unstable_cache silently failed to store it.
// Note: this cache lives in a single Node process's memory — fine for a
// single long-running server (e.g. `node .next/standalone/server.js`), but
// it will NOT be shared across multiple instances if you ever scale
// horizontally (e.g. multiple serverless/edge instances). In that case you'd
// need a shared store like Redis instead.
let lessonsCache: { data: LessonsResult; expiresAt: number } | null = null;
let lessonsInFlight: Promise<LessonsResult> | null = null;

let liveAttendanceCache: { data: LiveAttendanceResult; expiresAt: number } | null = null;
let liveAttendanceInFlight: Promise<LiveAttendanceResult> | null = null;

async function getCachedLessons(): Promise<LessonsResult> {
  const now = Date.now();
  if (lessonsCache && lessonsCache.expiresAt > now) return lessonsCache.data;
  if (lessonsInFlight) return lessonsInFlight; // de-dupe concurrent requests hitting a cold cache

  lessonsInFlight = fetchLessons()
    .then((data) => {
      lessonsCache = { data, expiresAt: Date.now() + LESSONS_TTL_MS };
      return data;
    })
    .finally(() => {
      lessonsInFlight = null;
    });

  return lessonsInFlight;
}

async function getCachedLiveAttendanceRows(): Promise<LiveAttendanceResult> {
  const now = Date.now();
  if (liveAttendanceCache && liveAttendanceCache.expiresAt > now) return liveAttendanceCache.data;
  if (liveAttendanceInFlight) return liveAttendanceInFlight;

  liveAttendanceInFlight = fetchLiveAttendance()
    .then((data) => {
      liveAttendanceCache = { data, expiresAt: Date.now() + LIVE_ATTENDANCE_TTL_MS };
      return data;
    })
    .finally(() => {
      liveAttendanceInFlight = null;
    });

  return liveAttendanceInFlight;
}

/** Complete academic dataset; filter and pagination values are not cache keys. */
export async function getCachedStudents(): Promise<Student[]> {
  const lessons = await getCachedLessons();
  return lessons.map((lesson) => ({
    student_id: lesson.studentId,
    student_name: lesson.student.name,
    public_key: lesson.student.publicKey,
    group_name: lesson.group.name,
    subject_name: lesson.subjectName,
    teacher_name: lesson.teacher.name,
    teacher_id: lesson.teacherId,
    totalCurrentGrade: lesson.totalCurrentGrade,
    totalFullGrade: lesson.totalFullGrade,
    percentageGrade: lesson.percentageGrade,
    assignments: lesson.assignments,
    attendances: parseJsonAttendances(lesson.attendances),
  }));
}

/** Live attendance is cached separately because it changes more frequently. */
export async function getCachedLiveAttendanceStatuses(): Promise<LiveAttendanceResult> {
  return getCachedLiveAttendanceRows();
}

// Grouping raw lesson rows into per-student/per-course profiles is the
// expensive step (string keys, nested Maps, iterating every attendance row).
// Cache the grouped output itself so filtering (which runs on every
// keystroke) only has to filter an already-built array, not rebuild it from
// scratch each time. Shares the same TTL/invalidation as the raw dataset.
let groupedProfilesCache: { data: StudentWithCourses[]; expiresAt: number } | null = null;
let groupedProfilesInFlight: Promise<StudentWithCourses[]> | null = null;

export async function getCachedGroupedProfiles(): Promise<StudentWithCourses[]> {
  const now = Date.now();
  if (groupedProfilesCache && groupedProfilesCache.expiresAt > now) return groupedProfilesCache.data;
  if (groupedProfilesInFlight) return groupedProfilesInFlight;

  groupedProfilesInFlight = getCachedStudents()
    .then((students) => {
      const data = buildAllProfilesFromAttendance(students);
      groupedProfilesCache = { data, expiresAt: Date.now() + LESSONS_TTL_MS };
      return data;
    })
    .finally(() => {
      groupedProfilesInFlight = null;
    });

  return groupedProfilesInFlight;
}

// Plain in-memory cache

let creditsCache: { data: CreditsResult; expiresAt: number } | null = null;
let creditsInFlight: Promise<CreditsResult> | null = null;

async function getCachedCredits(): Promise<CreditsResult> {
  const now = Date.now();
  if (creditsCache && creditsCache.expiresAt > now) return creditsCache.data;
  if (creditsInFlight) return creditsInFlight;

  creditsInFlight = fetchCredits()
    .then((data) => {
      creditsCache = { data, expiresAt: Date.now() + LESSONS_TTL_MS };
      return data;
    })
    .finally(() => {
      creditsInFlight = null;
    });

  return creditsInFlight;
}

// The individual /students/[publicKey] page used to hit the DB fresh on
// every request (findUnique + credits + latest attendance) — correct, but
// slow, and it never benefited from any of the caching above. Build a
// publicKey -> profile map once per cache window instead, reusing the
// already-cached grouped profiles, credits, and live attendance, so a
// student page load becomes a plain in-memory Map lookup.
let studentProfileMapCache: { data: Map<string, StudentWithCourses>; expiresAt: number } | null = null;
let studentProfileMapInFlight: Promise<Map<string, StudentWithCourses>> | null = null;

async function buildStudentProfileMap(): Promise<Map<string, StudentWithCourses>> {
  const [profiles, credits, liveAttendance] = await Promise.all([
    getCachedGroupedProfiles(),
    getCachedCredits(),
    getCachedLiveAttendanceRows(),
  ]);

  const creditsByStudent = new Map(credits.map((c) => [c.studentId, c]));
  const attendanceByStudent = new Map(liveAttendance.map((a) => [a.studentId, a]));

  const map = new Map<string, StudentWithCourses>();
  for (const profile of profiles) {
    if (!profile.public_key) continue;

    const credit = creditsByStudent.get(profile.student_id);
    const gradesData = credit
      ? parseCreditData(credit.grades, credit.totals, credit.byDepartment)
      : undefined;

    const latestAttendance = attendanceByStudent.get(profile.student_id);

    map.set(profile.public_key, {
      ...profile,
      gradesData,
      attendanceStatus: latestAttendance
        ? {
            status:
              latestAttendance.inside === 1
                ? "here"
                : latestAttendance.inside === 0 && latestAttendance.timeLog
                  ? "exit"
                  : "do not come",
            inside: latestAttendance.inside,
            timeLog: latestAttendance.timeLog ? new Date(latestAttendance.timeLog).toISOString() : null,
            lastUpdated: new Date(latestAttendance.createdAt).toISOString(),
          }
        : undefined,
    });
  }

  return map;
}

export async function getCachedStudentProfileByPublicKey(
  publicKey: string
): Promise<StudentWithCourses | null> {
  const now = Date.now();
  if (!studentProfileMapCache || studentProfileMapCache.expiresAt <= now) {
    if (!studentProfileMapInFlight) {
      studentProfileMapInFlight = buildStudentProfileMap()
        .then((data) => {
          studentProfileMapCache = { data, expiresAt: Date.now() + LESSONS_TTL_MS };
          return data;
        })
        .finally(() => {
          studentProfileMapInFlight = null;
        });
    }
    await studentProfileMapInFlight;
  }
  return studentProfileMapCache!.data.get(publicKey) ?? null;
}

/** Call after writes (e.g. the admin seed job) to force the next read to hit the DB. */
export function invalidateStudentsDataCache() {
  lessonsCache = null;
  groupedProfilesCache = null;
  creditsCache = null;
  studentProfileMapCache = null;
}

export function invalidateLiveStatusCache() {
  liveAttendanceCache = null;
}
