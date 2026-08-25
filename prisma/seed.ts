import { PrismaClient } from "@prisma/client";
import { JsonValue, InputJsonValue } from "../lib/prisma-enums";
import { readFileSync } from "fs";
import { join } from "path";
import crypto from "crypto";

const prisma = new PrismaClient({
  log: ["error", "warn"],
});

type AttendanceEvent = {
  date?: string | number | null;
  status?: string;
  inside?: number;
};

type AttendanceRow = {
  student_id: number;
  student_name: string;
  group_name: string;
  subject_name: string;
  teacher_name: string;
  teacher_id: string;
  attendances: AttendanceEvent[];
};

type GradeRow = {
  student_id: number;
  student_name: string;
  group_name: string;
  subject_name: string;
  teacher_name: string;
  teacher_id: string;
  total_current_grade: number;
  total_full_grade: number;
  percentage: number;
  assignments: JsonValue[];
};

function lessonKey(
  studentId: number,
  subjectName: string,
  teacherId: string,
  groupName: string
) {
  return `${studentId}|${subjectName}|${teacherId}|${groupName}`;
}

type MergedLesson = {
  student_id: number;
  student_name: string;
  group_name: string;
  subject_name: string;
  teacher_name: string;
  teacher_id: string;

  attendances: JsonValue[];

  total_current_grade: number;
  total_full_grade: number;
  percentage: number;

  assignments: JsonValue[];
};

async function main() {
  console.log("Starting seed...");

  // =====================================================
  // LOAD JSON FILES
  // =====================================================

  const attendancePath = join(
    process.cwd(),
    "attendance.json"
  );

  const gradePath = join(
    process.cwd(),
    "grade.json"
  );

  const attendanceJson = JSON.parse(
    readFileSync(attendancePath, "utf-8")
  );

  const gradeJson = JSON.parse(
    readFileSync(gradePath, "utf-8")
  );

  const attendanceRows: AttendanceRow[] =
    attendanceJson.data ?? [];

  const gradeRows: GradeRow[] =
    gradeJson.data ?? [];

  console.log(
    `Attendance rows: ${attendanceRows.length}`
  );

  console.log(
    `Grade rows: ${gradeRows.length}`
  );

  // =====================================================
  // CLEAN DATABASE
  // =====================================================

  function safeArrayMerge<T>(a: T[] | undefined, b: T[] | undefined): T[] {
    return [...(a ?? []), ...(b ?? [])];
  }

  console.log("Cleaning database...");

  await prisma.$transaction([
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),

    prisma.attendance.deleteMany(),

    prisma.lesson.deleteMany(),

    prisma.student.deleteMany(),
    prisma.group.deleteMany(),
    prisma.teacher.deleteMany(),
  ]);

  // =====================================================
  // MERGE DATA
  // =====================================================

  console.log("Merging lesson data...");

  const merged = new Map<string, MergedLesson>();

  // -------------------------
  // Attendance merge
  // -------------------------

  for (const row of attendanceRows) {
    const key = lessonKey(
      Number(row.student_id),
      row.subject_name,
      row.teacher_id,
      row.group_name
    );

    if (!merged.has(key)) {
      merged.set(key, {
        student_id: Number(row.student_id),
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
      prev.attendances = safeArrayMerge(prev.attendances, row.attendances ?? []);
    }
  }

  // -------------------------
  // Grade merge
  // -------------------------

  for (const row of gradeRows) {
    const key = lessonKey(
      Number(row.student_id),
      row.subject_name,
      row.teacher_id,
      row.group_name
    );

    if (!merged.has(key)) {
      merged.set(key, {
        student_id: Number(row.student_id),
        student_name: row.student_name,
        group_name: row.group_name,
        subject_name: row.subject_name,
        teacher_name: row.teacher_name,
        teacher_id: row.teacher_id,
        attendances: [],
        total_current_grade: row.total_current_grade ?? 0,
        total_full_grade: row.total_full_grade ?? 0,
        percentage: row.percentage ?? 0,
        assignments: row.assignments ?? [],
      });
    } else {
      const prev = merged.get(key)!;

      // FIX: keep best values instead of blind overwrite
      prev.total_current_grade = row.total_current_grade ?? prev.total_current_grade;
      prev.total_full_grade = row.total_full_grade ?? prev.total_full_grade;
      prev.percentage = row.percentage ?? prev.percentage;

      // FIX: merge assignments instead of replace
      prev.assignments = safeArrayMerge(prev.assignments, row.assignments ?? []);
    }
  }

  console.log(
    `Merged lessons: ${merged.size}`
  );

  // =====================================================
  // CREATE TEACHERS
  // =====================================================

  console.log("Creating teachers...");

  const teacherMap = new Map<string, string>();

  for (const row of merged.values()) {
    teacherMap.set(
      row.teacher_id,
      row.teacher_name
    );
  }

  await prisma.teacher.createMany({
    data: [...teacherMap.entries()].map(
      ([id, name]) => ({
        id,
        name,
      })
    ),
    skipDuplicates: true,
  });

  console.log(
    `Teachers created: ${teacherMap.size}`
  );

  // =====================================================
  // CREATE GROUPS
  // =====================================================

  console.log("Creating groups...");

  const groupNames = [
    ...new Set(
      [...merged.values()].map(
        (row) => row.group_name
      )
    ),
  ];

  await prisma.group.createMany({
    data: groupNames.map((name) => ({
      name,
    })),
    skipDuplicates: true,
  });

  const groups = await prisma.group.findMany({
    select: {
      id: true,
      name: true,
    },
  }) as Array<{ id: number; name: string }>;

  const groupIdByName = new Map<string, number>(
    groups.map((g) => [g.name, Number(g.id)])
  );


  console.log(
    `Groups created: ${groupNames.length}`
  );

  // =====================================================
  // CREATE STUDENTS
  // =====================================================

  console.log("Creating students...");

  const studentMap = new Map<number, string>();

  for (const row of merged.values()) {
    studentMap.set(
      row.student_id,
      row.student_name
    );
  }

  const invalidEntries = [...studentMap.entries()].filter(
    ([id]) => id === undefined || id === null || isNaN(Number(id)) || String(id).trim() === ""
  );

  if (invalidEntries.length > 0) {
    console.log("⚠️ Mana bu yaroqsiz ma'lumotlar filtrlab tashlandi:", invalidEntries);
  }

  const validStudentsData = [...studentMap.entries()]
    .filter(([studentId]) => {
      const idAsNumber = Number(studentId);
      return studentId !== undefined && studentId !== null && !isNaN(idAsNumber) && String(studentId).trim() !== "";
    })
    .map(([studentId, name]) => ({
      studentId: Number(studentId),
      name: name,
      jduId: String(studentId),
    }));

  await prisma.student.createMany({
    data: validStudentsData,
    skipDuplicates: true,
  });

  console.log(`Students created: ${validStudentsData.length}`);

  // =====================================================
  // CREATE LESSONS
  // =====================================================

  console.log("Creating lessons...");

  const lessons = [...merged.values()];

  const chunkSize = 200;

  for (
    let i = 0;
    i < lessons.length;
    i += chunkSize
  ) {
    const chunk = lessons.slice(
      i,
      i + chunkSize
    );

    const validChunk = chunk.filter(row => {
      const idAsNumber = Number(row.student_id);
      return row.student_id !== undefined && row.student_id !== null && !isNaN(idAsNumber) && String(row.student_id).trim() !== "";
    });

    await prisma.lesson.createMany({
      data: validChunk.map((row) => {
        const groupId =
          groupIdByName.get(row.group_name);

        if (!groupId) {
          throw new Error(
            `Group not found: ${row.group_name}`
          );
        }

        return {
          studentId: Number(row.student_id),

          teacherId: row.teacher_id,

          groupId,

          subjectName: row.subject_name,

          totalCurrentGrade:
            row.total_current_grade,

          totalFullGrade:
            row.total_full_grade,

          percentageGrade:
            row.percentage,

          assignments:
            row.assignments as InputJsonValue,

          attendances:
            row.attendances as InputJsonValue,
        };
      }),
      skipDuplicates: true,
    });

    console.log(
      `Inserted lessons ${i + 1} - ${Math.min(
        i + chunkSize,
        lessons.length
      )}`
    );
  }

  // =====================================================
  // CREATE ATTENDANCES & STUDENT CREDITS
  // =====================================================

  console.log("Processing separate attendances and student credits...");

  const attendanceRecordsData: Array<{ studentId: number; inside: number; timeLog: Date | null }> = [];
  const creditMap = new Map<
    number,
    {
      grades: Record<string, JsonValue>;
      totals: Record<string, JsonValue>;
    }
  >();

  for (const row of merged.values()) {
    const studentId = Number(row.student_id);

    if (isNaN(studentId)) continue;

    // --- 1. Davomatlarni (Attendance) yig'ish ---
    if (row.attendances && Array.isArray(row.attendances)) {
      for (const att of row.attendances) {
        const item = att as AttendanceEvent | Record<string, unknown> | null;
        if (!item || typeof item !== "object") continue;

        const dateValue = (item as AttendanceEvent).date;
        const logDate =
          typeof dateValue === "string" || typeof dateValue === "number"
            ? new Date(dateValue)
            : null;
        if (logDate && isNaN(logDate.getTime())) continue;

        const insideValue =
          (item as AttendanceEvent).status === "present" ||
            (item as AttendanceEvent).inside === 1
            ? 1
            : 0;

        attendanceRecordsData.push({
          studentId: studentId,
          inside: insideValue,
          timeLog: logDate,
        });
      }
    }

    // --- 2. Baholarni (StudentCredit) yig'ish ---
    if (row.assignments) {
      if (!creditMap.has(studentId)) {
        creditMap.set(studentId, { grades: {}, totals: {} });
      }

      const currentCredit = creditMap.get(studentId)!;
      const subjectKey = row.subject_name || "Unknown Subject";

      currentCredit.grades[subjectKey] = row.assignments;
      currentCredit.totals[subjectKey] = {
        totalCurrentGrade: row.total_current_grade,
        totalFullGrade: row.total_full_grade,
        percentageGrade: row.percentage,
      };
    }
  }

  // --- 3. Davomatlarni bazaga yuklash ---
  if (attendanceRecordsData.length > 0) {
    console.log(`Inserting ${attendanceRecordsData.length} attendances...`);
    const attChunkSize = 200;
    for (let i = 0; i < attendanceRecordsData.length; i += attChunkSize) {
      const chunk = attendanceRecordsData.slice(i, i + attChunkSize);
      await prisma.attendance.createMany({
        data: chunk,
        skipDuplicates: true,
      });
    }
    console.log("Attendances created successfully.");
  }

  // --- 4. Baholarni (StudentCredit) bazaga yuklash ---
  if (creditMap.size > 0) {
    console.log(`Inserting ${creditMap.size} student credits...`);

    const creditRecords = [...creditMap.entries()].map(([studentId, data]) => ({
      studentId: studentId,
      grades: data.grades as InputJsonValue,
      totals: data.totals as InputJsonValue,
      byDepartment: {} as InputJsonValue,
    }));

    const creditChunkSize = 200;
    for (let i = 0; i < creditRecords.length; i += creditChunkSize) {
      const chunk = creditRecords.slice(i, i + creditChunkSize);

      // Model nomi camelCase mantiqida kichik harf bilan yoziladi
      await prisma.studentCredit.createMany({
        data: chunk,
        skipDuplicates: true,
      });
    }
    console.log("Student credits created successfully.");
  }

  // =====================================================
  // CREATE DEFAULT USER
  // =====================================================
  // =====================================================
  // CREATE DEFAULT USER
  // =====================================================

  console.log("Creating default user...");

  const defaultEmail = "admin@gmail.com";
  const defaultPassword = "password_123456789";

  const existingUser = await prisma.user.findUnique({
    where: { email: defaultEmail },
  });

  if (!existingUser) {
    // Better Auth 100% taniydigan sodda va aniq hash formati:
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.pbkdf2Sync(defaultPassword, salt, 1000, 64, "sha512").toString("hex");

    // await auth.api.signUpEmail({
    //   body: {
    //     email: process.env.SUPERADMIN_EMAIL!,
    //     password: process.env.SUPERADMIN_PASSWORD!,
    //     name: "Super Admin",
    //   },
    // });

    // await prisma.user.update({
    //   where: {
    //     email: process.env.SUPERADMIN_EMAIL!,
    //   },
    //   data: {
    //     role: "SUPERADMIN",
    //     active: true,
    //     userNumber: 10000001,
    //   },
    // });

    console.log(`✓ Created default user and account successfully.`);
  }

  // =====================================================
  // DONE
  // =====================================================

  console.log("================================");
  console.log("SEED COMPLETED");
  console.log("================================");

  console.log({
    teachers: teacherMap.size,
    groups: groupNames.length,
    students: studentMap.size,
    lessons: lessons.length,
    attendances: attendanceRecordsData.length,
    credits: creditMap.size
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
