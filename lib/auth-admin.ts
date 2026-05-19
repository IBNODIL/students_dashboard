import { getPrisma } from "./prisma";
import bcryptjs from "bcryptjs";

const prisma = getPrisma();

export async function createDefaultUser(
  email: string,
  password: string
): Promise<void> {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log(`User with email ${email} already exists`);
      return;
    }

    // Hash the password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Create the user
    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        emailVerified: true,
      },
    });

    console.log(`✓ User created: ${email}`);
  } catch (error) {
    console.error("Failed to create default user:", error);
    throw error;
  }
}

export async function updateUserPassword(
  email: string,
  newPassword: string
): Promise<void> {
  try {
    const hashedPassword = await bcryptjs.hash(newPassword, 10);

    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    console.log(`✓ Password updated for user: ${email}`);
  } catch (error) {
    console.error("Failed to update password:", error);
    throw error;
  }
}
