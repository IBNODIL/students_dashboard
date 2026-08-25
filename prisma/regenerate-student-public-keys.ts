import "dotenv/config";
import { writeFileSync } from "node:fs";
import { createStudentPublicKey } from "../lib/student-public-key";
import { getPrisma } from "../lib/prisma";

/**
 * Regenerates EVERY student's public_key using the current
 * createStudentPublicKey formula (studentId + phone, 8-char base64url).
 *
 * DESTRUCTIVE: any previously issued/shared /students/[publicKey] link will
 * stop working once its owner's key changes here. Requires an explicit
 * --confirm flag to run for real; without it, this only does a dry run and
 * reports what WOULD change.
 *
 * Usage:
 *   npx tsx prisma/regenerate-student-public-keys.ts            (dry run)
 *   npx tsx prisma/regenerate-student-public-keys.ts --confirm  (applies changes)
 */
async function main() {
  const confirmed = process.argv.includes("--confirm");

  if (!process.env.STUDENT_PROFILE_SECRET?.trim()) {
    throw new Error("STUDENT_PROFILE_SECRET is required. Configure it before regenerating public keys.");
  }

  const prisma = getPrisma();
  let students;
  try {
    students = await prisma.student.findMany({
      select: { studentId: true, name: true, phone: true, publicKey: true },
      orderBy: { studentId: "asc" },
    });
  } catch (error) {
    throw new Error(
      "DATABASE CONNECTION FAILED or the student public-key migration is missing. Run migrations first. " +
        (error instanceof Error ? error.message : String(error)),
    );
  }

  type Row = { studentId: number; name: string; oldKey: string | null; newKey: string };
  const changes: Row[] = [];

  for (const student of students) {
    const newKey = createStudentPublicKey(student.studentId, student.phone);
    if (newKey !== student.publicKey) {
      changes.push({
        studentId: student.studentId,
        name: student.name,
        oldKey: student.publicKey,
        newKey,
      });
    }
  }

  console.log(
    `${confirmed ? "Applying" : "[DRY RUN] Would apply"} ${changes.length} key change(s) out of ${students.length} total students.`,
  );

  if (changes.length === 0) {
    console.log("Nothing to do — all keys already match the current format.");
    return;
  }

  // Always write the mapping file, dry run or not, so you can review it
  // before committing, and keep a record afterward for reissuing links.
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const csvPath = `./public-key-remap-${timestamp}.csv`;
  const csvLines = [
    "student_id,name,old_key,new_key",
    ...changes.map((c) => `${c.studentId},"${c.name.replace(/"/g, '""')}",${c.oldKey ?? ""},${c.newKey}`),
  ];
  writeFileSync(csvPath, csvLines.join("\n"), "utf8");
  console.log(`Mapping written to ${csvPath}`);

  if (!confirmed) {
    console.log("\nThis was a dry run — no keys were changed.");
    console.log("Review the CSV above, then re-run with --confirm to apply:");
    console.log("  npx tsx prisma/regenerate-student-public-keys.ts --confirm");
    return;
  }

  let updated = 0;
  let failed = 0;
  for (const change of changes) {
    try {
      await prisma.student.update({
        where: { studentId: change.studentId },
        data: { publicKey: change.newKey },
      });
      updated += 1;
    } catch (error) {
      failed += 1;
      console.error(
        `Failed to update student ${change.studentId} (${change.name}): ` +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  console.log(`\nDone: ${updated} updated, ${failed} failed, out of ${changes.length} intended changes.`);
  if (failed > 0) {
    console.log("Re-run the script to retry failed rows (already-correct rows will be skipped automatically).");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
