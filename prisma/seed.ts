import { PrismaClient, Prisma } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";
import type { Student } from "../lib/types";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient({ 
  log: ["error", "warn"]
});

function rowKey(
  student_id: number,
  subject_name: string,
  teacher_id: string,
  group_name: string
): string {
  return `${student_id}|${subject_name}|${teacher_id}|${group_name}`;
}

type EchoRow = {
  student_id: number;
  student_name: string;
  group_name: string;
  subject_name: string;
  teacher_name: string;
  teacher_id: string;
  total_current_grade: number;
  total_full_grade: number;
  percentage: number;
  assignments: Prisma.JsonValue;
};

type Merged = {
  student_id: number;
  student_name: string;
  group_name: string;
  subject_name: string;
  teacher_name: string;
  teacher_id: string;
  attendances: Student["attendances"];
  total_current_grade: number;
  total_full_grade: number;
  percentage: number;
  assignments: Prisma.JsonValue;
};

async function main() {
  const attendancePath = join(process.cwd(), "attendance.json");
  const echoPath = join(process.cwd(), "echo.json");
  const attendanceTimePath = join(process.cwd(), "attendance-time.json");

  const attendanceJson = JSON.parse(
    readFileSync(attendancePath, "utf-8")
  ) as { data: unknown[] };
  const attendanceRows = (attendanceJson.data ?? []).filter(
    (row): row is Student =>
      row !== null &&
      typeof row === "object" &&
      typeof (row as Student).student_id === "number" &&
      Number.isFinite((row as Student).student_id) &&
      typeof (row as Student).teacher_id === "string" &&
      Array.isArray((row as Student).attendances)
  );

  const echoJson = JSON.parse(readFileSync(echoPath, "utf-8")) as {
    data?: EchoRow[];
  };
  const echoRows = (echoJson.data ?? []).filter(
    (row) =>
      row &&
      typeof row.student_id === "number" &&
      Number.isFinite(row.student_id)
  );

  const merged = new Map<string, Merged>();

  for (const row of attendanceRows) {
    const k = rowKey(
      row.student_id,
      row.subject_name,
      row.teacher_id,
      row.group_name
    );
    const prev = merged.get(k);
    if (prev) {
      prev.attendances = [...prev.attendances, ...row.attendances];
    } else {
      merged.set(k, {
        student_id: row.student_id,
        student_name: row.student_name,
        group_name: row.group_name,
        subject_name: row.subject_name,
        teacher_name: row.teacher_name,
        teacher_id: row.teacher_id,
        attendances: [...row.attendances],
        total_current_grade: 0,
        total_full_grade: 0,
        percentage: 0,
        assignments: [],
      });
    }
  }

  for (const row of echoRows) {
    const k = rowKey(
      row.student_id,
      row.subject_name,
      row.teacher_id,
      row.group_name
    );
    const prev = merged.get(k);
    if (prev) {
      prev.total_current_grade = row.total_current_grade;
      prev.total_full_grade = row.total_full_grade;
      prev.percentage = row.percentage;
      prev.assignments = (row.assignments ?? []) as Prisma.JsonValue;
      prev.student_name = row.student_name;
    } else {
      merged.set(k, {
        student_id: row.student_id,
        student_name: row.student_name,
        group_name: row.group_name,
        subject_name: row.subject_name,
        teacher_name: row.teacher_name,
        teacher_id: row.teacher_id,
        attendances: [],
        total_current_grade: row.total_current_grade,
        total_full_grade: row.total_full_grade,
        percentage: row.percentage,
        assignments: (row.assignments ?? []) as Prisma.JsonValue,
      });
    }
  }

  await prisma.$transaction([
    prisma.lesson.deleteMany(),
    prisma.student.deleteMany(),
    prisma.group.deleteMany(),
    prisma.teacher.deleteMany(),
  ]);

  const teacherMap = new Map<string, string>();
  for (const m of merged.values()) {
    teacherMap.set(m.teacher_id, m.teacher_name);
  }
  await prisma.teacher.createMany({
    data: [...teacherMap.entries()].map(([id, name]) => ({ id, name })),
  });

  const groupNames = [...new Set([...merged.values()].map((m) => m.group_name))];
  await prisma.group.createMany({
    data: groupNames.map((name) => ({ name })),
    skipDuplicates: true,
  });

  const groups = await prisma.group.findMany({
    select: { id: true, name: true },
  });
  const groupIdByName = new Map(groups.map((g) => [g.name, g.id]));

  const studentMap = new Map<number, string>();
  for (const m of merged.values()) {
    studentMap.set(m.student_id, m.student_name);
  }
  await prisma.student.createMany({
    data: [...studentMap.entries()].map(([studentId, name]) => ({
      studentId,
      name,
      jduId: String(studentId),
    })),
  });

  const rows = [...merged.values()];
  const chunk = 200;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    await prisma.lesson.createMany({
      data: slice.map((m) => {
        const gid = groupIdByName.get(m.group_name);
        if (gid === undefined) {
          throw new Error(`Missing group id for ${m.group_name}`);
        }
        return {
          studentId: m.student_id,
          teacherId: m.teacher_id,
          groupId: gid,
          subjectName: m.subject_name,
          totalCurrentGrade: m.total_current_grade,
          totalFullGrade: m.total_full_grade,
          percentageGrade: m.percentage,
          assignments: m.assignments as unknown as Prisma.InputJsonValue,
          attendances: m.attendances as unknown as Prisma.InputJsonValue,
        };
      }),
    });
  }

  // Seed real-time attendance data from attendance-time.json
  const attendanceTimeJson = JSON.parse(
    readFileSync(attendanceTimePath, "utf-8")
  ) as { students?: Array<{ name?: string; jdu_id?: string; inside?: string; time_log?: string | null }> };

  const attendanceStudents = attendanceTimeJson.students ?? [];
  
  // Get all existing students from database
  const existingStudents = await prisma.student.findMany({
    select: { studentId: true, name: true },
  });
  const attendanceStudentMap = new Map(
    existingStudents.map((s) => [s.name.toLowerCase(), s.studentId])
  );

  // Create attendance records for students that exist in database
  const attendanceData = attendanceStudents
    .filter(
      (s) =>
        s.name &&
        s.inside !== undefined &&
        attendanceStudentMap.has(s.name.toLowerCase())
    )
    .map((s) => {
      const studentId = attendanceStudentMap.get(s.name!.toLowerCase());
      return {
        studentId: studentId!,
        inside: parseInt(s.inside || "0", 10),
        timeLog: s.time_log ? new Date(s.time_log) : null,
      };
    });

  if (attendanceData.length > 0) {
    await prisma.attendance.deleteMany();
    for (const batch of splitArray(attendanceData, chunk)) {
      await prisma.attendance.createMany({
        data: batch,
        skipDuplicates: true,
      });
    }
  }

  // Create default user for login
  const defaultEmail = "secret@gmail.com";
  const defaultPassword = "123456789_password";

  const existingUser = await prisma.user.findUnique({
    where: { email: defaultEmail },
  });

  if (!existingUser) {
    const hashedPassword = await bcryptjs.hash(defaultPassword, 10);
    await prisma.user.create({
      data: {
        email: defaultEmail,
        password: hashedPassword,
        emailVerified: true,
      },
    });
    console.log(`✓ Created default user: ${defaultEmail}`);
    console.log(`  Password: ${defaultPassword}`);
  }

  console.log(
    `Seeded teachers=${teacherMap.size} groups=${groupNames.length} students=${studentMap.size} lessons=${rows.length} attendances=${attendanceData.length}`
  );
}

function splitArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
