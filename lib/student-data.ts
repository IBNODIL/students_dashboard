import type {
  Student,
  StudentWithCourses,
  Course,
  StudentAttendanceRow,
  FlatRecord,
  AttendanceRecord,
  AttendanceStats,
  EchoGradesBlock,
  EchoAssignment,
} from "@/lib/types";
import { getPrisma } from "@/lib/prisma";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseCreditData(
  grades: unknown,
  totals: unknown,
  byDepartment: unknown,
): StudentWithCourses["gradesData"] | undefined {
  if (!isRecord(grades) || !isRecord(totals) || !isRecord(byDepartment)) {
    return undefined;
  }

  const totalCreditsPassed = totals.total_credits_passed;
  const totalCreditsGraded = totals.total_credits_graded;
  const percentagePassed = totals.percentage_passed;
  if (
    typeof totalCreditsPassed !== "number" ||
    typeof totalCreditsGraded !== "number" ||
    typeof percentagePassed !== "number"
  ) {
    return undefined;
  }

  const parsedGrades: Record<string, Record<string, string>> = {};
  for (const [department, courses] of Object.entries(grades)) {
    if (!isRecord(courses)) return undefined;
    const parsedCourses: Record<string, string> = {};
    for (const [course, grade] of Object.entries(courses)) {
      if (typeof grade !== "string") return undefined;
      parsedCourses[course] = grade;
    }
    parsedGrades[department] = parsedCourses;
  }

  const parsedDepartments: Record<string, {
    total_credits_passed: number;
    total_credits_graded: number;
    percentage_passed: number;
  }> = {};
  for (const [department, value] of Object.entries(byDepartment)) {
    if (!isRecord(value)) return undefined;
    const passed = value.total_credits_passed;
    const graded = value.total_credits_graded;
    const percentage = value.percentage_passed;
    if (typeof passed !== "number" || typeof graded !== "number" || typeof percentage !== "number") {
      return undefined;
    }
    parsedDepartments[department] = {
      total_credits_passed: passed,
      total_credits_graded: graded,
      percentage_passed: percentage,
    };
  }

  return {
    grades: parsedGrades,
    totals: {
      total_credits_passed: totalCreditsPassed,
      total_credits_graded: totalCreditsGraded,
      percentage_passed: percentagePassed,
    },
    by_department: parsedDepartments,
  };
}

export const STATUS_POINTS: Record<string, number> = {
  P: 1,
  L: 0.5,
  U: 0,
  E: 1,
};

export const VALID_STATUSES = new Set(["P", "L", "U", "E"]);

export function getPoints(status: string): number {
  return STATUS_POINTS[status] ?? 0;
}

export function isValidStatus(status: string): boolean {
  return VALID_STATUSES.has(status);
}

export interface EchoDataRow extends EchoGradesBlock {
  student_id: number;
  student_name: string;
  group_name: string;
  subject_name: string;
  teacher_name: string;
  teacher_id: string;
}

export function rowKey(
  student_id: number,
  subject_name: string,
  teacher_id: string,
  group_name: string
): string {
  return `${student_id}|${subject_name}|${teacher_id}|${group_name}`;
}

export function buildCourse(
  records: Student[],
  filteredAttendances: StudentAttendanceRow[],
  echo?: EchoGradesBlock | null
): Course {
  const valid = filteredAttendances.filter((a) => VALID_STATUSES.has(a.status));
  const max_points = valid.length;
  const total_points = valid.reduce((s, a) => s + a.points, 0);
  const attendance_pct =
    max_points > 0 ? (total_points / max_points) * 100 : 0;

  const firstRecord = records[0];
  const course: Course = {
    subject_name: firstRecord.subject_name,
    teacher_name: firstRecord.teacher_name,
    teacher_id: firstRecord.teacher_id,
    group_name: firstRecord.group_name,
    total_points,
    max_points,
    attendance_pct,
    absence_pct: 100 - attendance_pct,
    present_count: filteredAttendances.filter((a) => a.status === "P").length,
    late_count: filteredAttendances.filter((a) => a.status === "L").length,
    absent_count: filteredAttendances.filter((a) => a.status === "U").length,
    excused_count: filteredAttendances.filter((a) => a.status === "E").length,
    attendances: filteredAttendances,
  };

  if (echo) {
    course.echo_grades = {
      total_current_grade: echo.total_current_grade,
      total_full_grade: echo.total_full_grade,
      percentage: echo.percentage,
      assignments: echo.assignments ?? [],
    };
  }

  return course;
}

export function buildStudentProfileFromRecords(
  records: Student[]
): StudentWithCourses | null {
  if (records.length === 0) return null;
  const firstRecord = records[0];

  const courseMap = new Map<string, Student[]>();
  for (const record of records) {
    const courseKey = `${record.subject_name}|${record.teacher_id}|${record.group_name}`;
    if (!courseMap.has(courseKey)) courseMap.set(courseKey, []);
    courseMap.get(courseKey)!.push(record);
  }

  const courses: Course[] = [];
  for (const courseRecords of courseMap.values()) {
    const allAtts: StudentAttendanceRow[] = [];
    for (const record of courseRecords) {
      for (const att of record.attendances) {
        allAtts.push({
          date: att.date,
          lesson_time: att.lesson_time,
          lesson_room: att.lesson_room,
          status: att.status ?? "",
          points: getPoints(att.status ?? ""),
        });
      }
    }

    const firstCourse = courseRecords[0];

    const echo: EchoGradesBlock = {
      total_current_grade: firstCourse.totalCurrentGrade ?? 0,
      total_full_grade: firstCourse.totalFullGrade ?? 0,
      percentage: firstCourse.percentageGrade ?? 0,
      assignments: parseJsonAssignments(firstCourse.assignments),
    };

    courses.push(buildCourse(courseRecords, allAtts, echo));
  }

  const groupLabels = [...new Set(records.map((r) => r.group_name))]
    .sort()
    .join(", ");
  return {
    student_id: firstRecord.student_id,
    student_name: firstRecord.student_name,
    group_name: groupLabels || firstRecord.group_name,
    public_key: firstRecord.public_key ?? null,
    courses,
  };
}

export function buildAllProfilesFromAttendance(
  students: Student[]
): StudentWithCourses[] {
  const studentMap = new Map<number, Student[]>();
  for (const record of students) {
    if (!studentMap.has(record.student_id)) {
      studentMap.set(record.student_id, []);
    }
    studentMap.get(record.student_id)!.push(record);
  }

  const result: StudentWithCourses[] = [];
  for (const [, records] of studentMap) {
    const profile = buildStudentProfileFromRecords(records);
    if (profile) result.push(profile);
  }
  return result;
}

export function buildFlatRecordsFromStudents(students: Student[]): FlatRecord[] {
  const flat: FlatRecord[] = [];

  for (const student of students) {
    const validAtts = student.attendances.filter((a) => isValidStatus(a.status));
    const student_max_points = validAtts.length;
    const student_total_points = validAtts.reduce(
      (sum, a) => sum + getPoints(a.status),
      0
    );
    const student_attendance_pct =
      student_max_points > 0
        ? (student_total_points / student_max_points) * 100
        : 0;
    const student_absence_pct = 100 - student_attendance_pct;

    for (const att of student.attendances) {
      flat.push({
        student_id: student.student_id,
        student_name: student.student_name,
        group_name: student.group_name,
        subject_name: student.subject_name,
        teacher_name: student.teacher_name,
        teacher_id: student.teacher_id,
        date: att.date,
        lesson_time: att.lesson_time,
        lesson_room: att.lesson_room,
        status: att.status ?? "",
        points: getPoints(att.status ?? ""),
        student_total_points,
        student_max_points,
        student_attendance_pct,
        student_absence_pct,
      });
    }
  }

  return flat;
}

export function buildStatsFromProfiles(
  students: StudentWithCourses[]
): AttendanceStats {
  const allAtts = students.flatMap((s) =>
    s.courses.flatMap((c) => c.attendances)
  );
  const valid = allAtts.filter((a) => VALID_STATUSES.has(a.status));
  const total_points = valid.reduce((s, a) => s + a.points, 0);
  const max_points = valid.length;

  return {
    total_records: allAtts.length,
    present_count: allAtts.filter((a) => a.status === "P").length,
    late_count: allAtts.filter((a) => a.status === "L").length,
    absent_count: allAtts.filter((a) => a.status === "U").length,
    excused_count: allAtts.filter((a) => a.status === "E").length,
    empty_count: allAtts.filter((a) => !VALID_STATUSES.has(a.status)).length,
    valid_records: valid.length,
    total_points,
    max_points,
    attendance_pct: max_points > 0 ? (total_points / max_points) * 100 : 0,
    absence_pct:
      max_points > 0 ? 100 - (total_points / max_points) * 100 : 0,
    unique_students: students.length,
  };
}

export function buildStatsFromFlatRecords(
  records: FlatRecord[]
): AttendanceStats {
  const valid = records.filter((r) => isValidStatus(r.status));
  const present_count = records.filter((r) => r.status === "P").length;
  const late_count = records.filter((r) => r.status === "L").length;
  const absent_count = records.filter((r) => r.status === "U").length;
  const excused_count = records.filter((r) => r.status === "E").length;
  const total_points = valid.reduce((sum, r) => sum + r.points, 0);
  const max_points = valid.length;
  const attendance_pct =
    max_points > 0 ? (total_points / max_points) * 100 : 0;
  const unique_students = new Set(records.map((r) => r.student_id)).size;

  return {
    total_records: records.length,
    present_count,
    late_count,
    absent_count,
    excused_count,
    empty_count: records.length - valid.length,
    valid_records: valid.length,
    total_points,
    max_points,
    attendance_pct,
    absence_pct: 100 - attendance_pct,
    unique_students,
  };
}

export function parseJsonAttendances(raw: unknown): AttendanceRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw as AttendanceRecord[];
}

function parseJsonAssignments(raw: unknown): EchoAssignment[] {
  if (!Array.isArray(raw)) return [];
  return raw as EchoAssignment[];
}

export function prismaLessonToCourse(lesson: {
  subjectName: string;
  teacherId: string;
  teacher: { id: string; name: string };
  group: { name: string };
  totalCurrentGrade: number;
  totalFullGrade: number;
  percentageGrade: number;
  assignments: unknown;
  attendances: unknown;
}): Course {
  const atts = parseJsonAttendances(lesson.attendances);
  const rows: StudentAttendanceRow[] = atts.map((att) => ({
    date: att.date,
    lesson_time: att.lesson_time,
    lesson_room: att.lesson_room,
    status: att.status ?? "",
    points: getPoints(att.status ?? ""),
  }));

  const dummy: Student = {
    student_id: 0,
    student_name: "",
    group_name: lesson.group.name,
    subject_name: lesson.subjectName,
    teacher_name: lesson.teacher.name,
    teacher_id: lesson.teacherId,
    attendances: [],
  };

  const echo: EchoGradesBlock = {
    total_current_grade: lesson.totalCurrentGrade,
    total_full_grade: lesson.totalFullGrade,
    percentage: lesson.percentageGrade,
    assignments: parseJsonAssignments(lesson.assignments),
  };

  return buildCourse([dummy], rows, echo);
}

export async function getStudentProfileFromDb(
  studentId: number
): Promise<StudentWithCourses | null> {
  const prisma = getPrisma();
  const student = await prisma.student.findUnique({
    where: { studentId },
    include: {
      lessons: { include: { teacher: true, group: true } },
    },
  });
  if (!student) return null;

  const groupLabels = [
    ...new Set(student.lessons.map((l: { group: { name: string } }) => l.group.name)),
  ]
    .sort()
    .join(", ");

  return {
    student_id: student.studentId,
    student_name: student.name,
    group_name: groupLabels,
    public_key: student.publicKey,
    courses: student.lessons.map(prismaLessonToCourse),
  } as StudentWithCourses;
}

export async function getStudentProfileFromDbByPublicKey(
  publicKey: string
): Promise<StudentWithCourses | null> {
  const prisma = getPrisma();
  const student = await prisma.student.findUnique({
    where: { publicKey },
    include: {
      lessons: { include: { teacher: true, group: true } },
      credits: true,
      attendances: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!student) return null;

  const groupLabels = [...new Set(student.lessons.map((l: { group: { name: string } }) => l.group.name))]
    .sort()
    .join(", ");

  const latestAttendance = student.attendances[0];
  const gradesData = student.credits
    ? parseCreditData(
      student.credits.grades,
      student.credits.totals,
      student.credits.byDepartment,
    )
    : undefined;

  return {
    student_id: student.studentId,
    student_name: student.name,
    group_name: groupLabels,
    public_key: student.publicKey,
    courses: student.lessons.map(prismaLessonToCourse),
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
        timeLog: latestAttendance.timeLog?.toISOString() ?? null,
        lastUpdated: latestAttendance.createdAt.toISOString(),
      }
      : undefined,
  };
}

export async function getFlatRecordsFromDb(): Promise<FlatRecord[]> {
  const prisma = getPrisma();
  const lessons = await prisma.lesson.findMany({
    include: { student: true, group: true, teacher: true },
  });

  const flat: FlatRecord[] = [];
  for (const lesson of lessons) {
    const atts = parseJsonAttendances(lesson.attendances);
    const validAtts = atts.filter((a) => isValidStatus(a.status));
    const student_max_points = validAtts.length;
    const student_total_points = validAtts.reduce(
      (sum, a) => sum + getPoints(a.status),
      0
    );
    const student_attendance_pct =
      student_max_points > 0
        ? (student_total_points / student_max_points) * 100
        : 0;
    const student_absence_pct = 100 - student_attendance_pct;

    for (const att of atts) {
      flat.push({
        student_id: lesson.studentId,
        student_name: lesson.student.name,
        group_name: lesson.group.name,
        subject_name: lesson.subjectName,
        teacher_name: lesson.teacher.name,
        teacher_id: lesson.teacherId,
        date: att.date,
        lesson_time: att.lesson_time,
        lesson_room: att.lesson_room,
        status: att.status ?? "",
        points: getPoints(att.status ?? ""),
        student_total_points,
        student_max_points,
        student_attendance_pct,
        student_absence_pct,
      });
    }
  }
  return flat;
}

export function hasDatabaseConfiguration(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export interface GroupedQueryFilters {
  name: string;
  group: string;
  studentId: string;
  subject: string;
  teacher: string;
  teacherId: string;
  room: string;
  lessonTime: string;
  attendanceOperator: string
  attendancePercent: string

  gradeOperator: string
  gradePercent: string
  status: string;
}

/** Same grouping and filter semantics as the dashboard grouped API (raw attendance rows). */
export function filterToGroupedProfiles(
  students: Student[],
  f: GroupedQueryFilters
): StudentWithCourses[] {
  const name = f.name.trim().toLowerCase();
  const group = f.group.trim().toLowerCase();
  const studentId = f.studentId.trim();
  const subject = f.subject.trim().toLowerCase();
  const teacher = f.teacher.trim().toLowerCase();
  const teacherId = f.teacherId.trim().toLowerCase();
  const room = f.room.trim();
  const lessonTime = f.lessonTime.trim();
  // Status filtering is handled outside this helper, using current student attendance state.

  const studentMap = new Map<number, Student[]>();
  for (const record of students) {
    if (!studentMap.has(record.student_id)) {
      studentMap.set(record.student_id, []);
    }
    studentMap.get(record.student_id)!.push(record);
  }

  const result: StudentWithCourses[] = [];

  for (const [, records] of studentMap) {
    const firstRecord = records[0];

    if (name && !firstRecord.student_name.toLowerCase().includes(name)) continue;
    if (group && !records.some((r) => r.group_name.toLowerCase().includes(group)))
      continue;
    if (studentId && !String(firstRecord.student_id).includes(studentId)) continue;

    const courseMap = new Map<string, Student[]>();
    for (const record of records) {
      const courseKey = `${record.subject_name}|${record.teacher_id}|${record.group_name}`;
      if (!courseMap.has(courseKey)) courseMap.set(courseKey, []);
      courseMap.get(courseKey)!.push(record);
    }

    const courses: Course[] = [];

    for (const courseRecords of courseMap.values()) {
      const courseFirstRecord = courseRecords[0];

      if (subject && !courseFirstRecord.subject_name.toLowerCase().includes(subject))
        continue;
      if (teacher && !courseFirstRecord.teacher_name.toLowerCase().includes(teacher))
        continue;
      if (teacherId && !courseFirstRecord.teacher_id.toLowerCase().includes(teacherId))
        continue;

      let allAtts: StudentAttendanceRow[] = [];
      for (const record of courseRecords) {
        for (const att of record.attendances) {
          allAtts.push({
            date: att.date,
            lesson_time: att.lesson_time,
            lesson_room: att.lesson_room,
            status: att.status ?? "",
            points: getPoints(att.status ?? ""),
          });
        }
      }

      if (room) allAtts = allAtts.filter((a) => String(a.lesson_room).includes(room));
      if (lessonTime) allAtts = allAtts.filter((a) => String(a.lesson_time) === lessonTime);

      if (
        (room || lessonTime) &&
        allAtts.length === 0
      )
        continue;

      const echo: EchoGradesBlock = {
        total_current_grade: courseFirstRecord.totalCurrentGrade ?? 0,
        total_full_grade: courseFirstRecord.totalFullGrade ?? 0,
        percentage: courseFirstRecord.percentageGrade ?? 0,
        assignments: parseJsonAssignments(courseFirstRecord.assignments),
      };

      courses.push(
        buildCourse(courseRecords, allAtts, echo)
      );
    }

    if (courses.length > 0) {
      const groupLabels = [...new Set(records.map((r) => r.group_name))]
        .sort()
        .join(", ");
      result.push({
        student_id: firstRecord.student_id,
        student_name: firstRecord.student_name,
        group_name: groupLabels || firstRecord.group_name,
        public_key: firstRecord.public_key ?? null,
        courses,
      } as StudentWithCourses);
    }
  }

  return result;
}

function recomputeCourseAttendanceStats(
  course: Course,
  attendances: StudentAttendanceRow[]
): Course {
  const valid = attendances.filter((a) => VALID_STATUSES.has(a.status));
  const max_points = valid.length;
  const total_points = valid.reduce((s, a) => s + a.points, 0);
  const attendance_pct = max_points > 0 ? (total_points / max_points) * 100 : 0;

  return {
    ...course,
    total_points,
    max_points,
    attendance_pct,
    absence_pct: 100 - attendance_pct,
    present_count: attendances.filter((a) => a.status === "P").length,
    late_count: attendances.filter((a) => a.status === "L").length,
    absent_count: attendances.filter((a) => a.status === "U").length,
    excused_count: attendances.filter((a) => a.status === "E").length,
    attendances,
  };
}

/**
 * Same course/name/subject/teacher/room/lessonTime filtering as
 * filterToGroupedProfiles, but operates on ALREADY-GROUPED profiles instead
 * of re-grouping every raw lesson row from scratch. Use this on the hot path
 * (every filter keystroke) — pair it with a cache of buildAllProfilesFromAttendance
 * output so the expensive grouping only happens once per cache window, not
 * once per request.
 */
export function filterGroupedProfiles(
  profiles: StudentWithCourses[],
  f: GroupedQueryFilters
): StudentWithCourses[] {
  const name = f.name.trim().toLowerCase();
  const group = f.group.trim().toLowerCase();
  const studentId = f.studentId.trim();
  const subject = f.subject.trim().toLowerCase();
  const teacher = f.teacher.trim().toLowerCase();
  const teacherId = f.teacherId.trim().toLowerCase();
  const room = f.room.trim();
  const lessonTime = f.lessonTime.trim();

  const result: StudentWithCourses[] = [];

  for (const profile of profiles) {
    if (name && !profile.student_name.toLowerCase().includes(name)) continue;
    if (group && !profile.group_name.toLowerCase().includes(group)) continue;
    if (studentId && !String(profile.student_id).includes(studentId)) continue;

    let courses = profile.courses;

    if (subject || teacher || teacherId) {
      courses = courses.filter((course) => {
        if (subject && !course.subject_name.toLowerCase().includes(subject)) return false;
        if (teacher && !course.teacher_name.toLowerCase().includes(teacher)) return false;
        if (teacherId && !course.teacher_id.toLowerCase().includes(teacherId)) return false;
        return true;
      });
    }

    if (room || lessonTime) {
      const narrowed: Course[] = [];
      for (const course of courses) {
        const attendances = course.attendances.filter((a) => {
          if (room && !String(a.lesson_room).includes(room)) return false;
          if (lessonTime && String(a.lesson_time) !== lessonTime) return false;
          return true;
        });
        if (attendances.length === 0) continue;
        narrowed.push(recomputeCourseAttendanceStats(course, attendances));
      }
      courses = narrowed;
    }

    if (courses.length > 0) {
      result.push(courses === profile.courses ? profile : { ...profile, courses });
    }
  }

  return result;
}

let dbHasLessonsCache: boolean | undefined;

/** True when DATABASE_URL is set and the `lessons` table has at least one row (seed has been run). */
export async function isDatabasePopulated(): Promise<boolean> {
  if (!hasDatabaseConfiguration()) return false;
  if (dbHasLessonsCache !== undefined) return dbHasLessonsCache;
  try {
    dbHasLessonsCache = (await getPrisma().lesson.count()) > 0;
  } catch {
    dbHasLessonsCache = false;
  }
  return dbHasLessonsCache;
}

export async function loadRawStudentsForAggregation(): Promise<Student[]> {
  const prisma = getPrisma();
  const lessons = await prisma.lesson.findMany({
    include: { student: true, group: true, teacher: true },
  }) as Array<{
    studentId: number; subjectName: string; teacherId: string;
    totalCurrentGrade: number; totalFullGrade: number; percentageGrade: number;
    assignments: unknown; attendances: unknown;
    student: { name: string; publicKey: string | null };
    group: { name: string };
    teacher: { name: string };
  }>;
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
