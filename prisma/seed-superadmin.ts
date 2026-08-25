import { PrismaClient } from "@prisma/client";
import { auth } from "../lib/auth";

const prisma = new PrismaClient();

const email = process.env.SUPERADMIN_EMAIL || "superadmin@jdu.uz";
const password = process.env.SUPERADMIN_PASSWORD || "SuperAdmin@123";

async function main() {
  console.log(`\n🔧 Seeding SUPERADMIN user...`);
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${password}`);

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.role === "SUPERADMIN") {
      console.log(`\n✅ SUPERADMIN already exists — nothing to do.`);
      return;
    }
    await prisma.user.update({
      where: { email },
      data: { role: "SUPERADMIN", active: true },
    });
    console.log(`\n✅ Existing user upgraded to SUPERADMIN.`);
    return;
  }

  // Use better-auth's own API to create the user so the password is
  // hashed using exactly the format better-auth expects (bcrypt).
  const result = await auth.api.signUpEmail({
    body: {
      email,
      password,
      name: "Super Admin",
    },
  });

  if (!result?.user?.id) {
    throw new Error("Failed to create user via better-auth");
  }

  // Upgrade the role to SUPERADMIN (better-auth defaults to STUDENT)
  await prisma.user.update({
    where: { id: result.user.id },
    data: { role: "SUPERADMIN", active: true, emailVerified: true },
  });

  console.log(`\n✅ SUPERADMIN created successfully!`);
  console.log(`   ID:       ${result.user.id}`);
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${password}`);
  console.log(`\n⚠️  Change the password after first login.`);
}

main()
  .catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());