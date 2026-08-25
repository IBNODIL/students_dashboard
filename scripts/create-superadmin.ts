import "dotenv/config";

import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

const prisma = getPrisma();

async function main() {
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "SUPERADMIN_EMAIL or SUPERADMIN_PASSWORD is missing in .env"
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    console.log("✅ Superadmin already exists.");
    return;
  }

  console.log("Creating Superadmin...");

  const result = await auth.api.signUpEmail({
    body: {
      email,
      password,
      name: "Super Admin",
    },
  });

  await prisma.user.update({
    where: {
      id: result.user.id,
    },
    data: {
      role: "SUPERADMIN",
      active: true,
      userNumber: 10000001,
    },
  });

  console.log("✅ Superadmin created successfully!");
  console.log("--------------------------------");
  console.log("Email:", email);
  console.log("Password:", password);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });