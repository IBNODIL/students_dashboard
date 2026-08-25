import "dotenv/config";
import { createStudentPublicKey } from "../lib/student-public-key";
import { getPrisma } from "../lib/prisma";

async function main() {
  if (!process.env.STUDENT_PROFILE_SECRET?.trim()) {
    throw new Error("STUDENT_PROFILE_SECRET is required. Configure it before backfilling public keys.");
  }
  const prisma = getPrisma();
  let students;
  try {
    students = await prisma.student.findMany({
      select: { studentId: true, name: true, phone: true, publicKey: true },
    });
  } catch (error) {
    throw new Error(
      "DATABASE CONNECTION FAILED or the student public-key migration is missing. Run migrations first. " +
        (error instanceof Error ? error.message : String(error)),
    );
  }
  let updated = 0;
  for (const student of students) {
    const publicKey = createStudentPublicKey(student.studentId, student.phone);
    if (!student.publicKey) {
      await prisma.student.update({ where: { studentId: student.studentId }, data: { publicKey } });
      updated += 1;
    }
  }
  console.log(
    "Student public-key backfill complete: " +
      updated +
      " updated, " +
      (students.length - updated) +
      " already present, " +
      students.length +
      " total.",
  );
}
main().catch((error) => { console.error(error); process.exit(1); }).finally(async () => { await getPrisma().$disconnect(); });
