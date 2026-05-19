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

    courses.push(buildCourse(courseRecords, allAtts, null));
  }

  const groupLabels = [...new Set(records.map((r) => r.group_name))]
    .sort()
    .join(", ");
  return {
    student_id: firstRecord.student_id,
    student_name: firstRecord.student_name,
    group_name: groupLabels || firstRecord.group_name,
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
    ...new Set(student.lessons.map((l) => l.group.name)),
  ]
    .sort()
    .join(", ");

  return {
    student_id: student.studentId,
    student_name: student.name,
    group_name: groupLabels,
    courses: student.lessons.map(prismaLessonToCourse),
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

export function useDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export interface GroupedQueryFilters {
  name: string;
  group: string;
  studentId: string;
  subject: string;
  teacher: string;
  teacherId: string;
  date: string;
  room: string;
  lessonTime: string;
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
  const date = f.date.trim();
  const room = f.room.trim();
  const lessonTime = f.lessonTime.trim();
  const status = f.status.trim();

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

      if (date) allAtts = allAtts.filter((a) => a.date.startsWith(date));
      if (room) allAtts = allAtts.filter((a) => String(a.lesson_room).includes(room));
      if (lessonTime) allAtts = allAtts.filter((a) => String(a.lesson_time) === lessonTime);
      if (status && status !== "all")
        allAtts = allAtts.filter((a) => a.status === status);

      if (
        (date || room || lessonTime || (status && status !== "all")) &&
        allAtts.length === 0
      )
        continue;

      courses.push(
        buildCourse(courseRecords, allAtts, null)
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
        courses,
      });
    }
  }

  return result;
}

let dbHasLessonsCache: boolean | undefined;

/** True when DATABASE_URL is set and the `lessons` table has at least one row (seed has been run). */
export async function isDatabasePopulated(): Promise<boolean> {
  if (!useDatabase()) return false;
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
  });
  return lessons.map((lesson) => ({
    student_id: lesson.studentId,
    student_name: lesson.student.name,
    group_name: lesson.group.name,
    subject_name: lesson.subjectName,
    teacher_name: lesson.teacher.name,
    teacher_id: lesson.teacherId,
    attendances: parseJsonAttendances(lesson.attendances),
  }));
}
