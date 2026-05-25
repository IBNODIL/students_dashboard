import { auth } from "./auth";

export async function createDefaultUser(
  email: string,
  password: string,
  name?: string
) {
  try {
    const result = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: name || "Admin",
      },
    });

    console.log("✓ User created:", result.user.email);

    return result;
  } catch (error) {
    console.error("Failed to create user:", error);
    throw error;
  }
}