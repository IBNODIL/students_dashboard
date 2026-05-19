import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { getPrisma } from "./prisma";
import bcryptjs from "bcryptjs";

const prisma = getPrisma();

const betterAuthBaseURL =
  process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP || "http://localhost:3000";
const betterAuthSecret =
  process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "development-secret";

if (!betterAuthBaseURL) {
  throw new Error(
    "Missing BETTER_AUTH_URL or NEXT_PUBLIC_APP environment variable for Better Auth base URL"
  );
}

if (!betterAuthSecret && process.env.NODE_ENV === "production") {
  throw new Error(
    "Missing BETTER_AUTH_SECRET or AUTH_SECRET environment variable for Better Auth secret"
  );
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  baseURL: betterAuthBaseURL,
  secret: betterAuthSecret,
  emailAndPassword: {
    enabled: true,
    autoSignUpEmail: false, // Require manual verification
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  user: {
    changeEmail: {
      enabled: false,
      sendVerificationEmail: false,
    },
  },
});

export type Session = typeof auth.$Infer.Session;
