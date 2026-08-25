import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const betterAuthBaseURL = process.env.BETTER_AUTH_URL;
const betterAuthSecret = process.env.BETTER_AUTH_SECRET;

if (!betterAuthBaseURL) {
  throw new Error(
    "Missing BETTER_AUTH_URL environment variable for Better Auth base URL"
  );
}

if (!betterAuthSecret && process.env.NODE_ENV === "production") {
  throw new Error(
    "Missing BETTER_AUTH_SECRET environment variable for Better Auth secret"
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
    autoSignUpEmail: false,
  },

  user: {
    changeEmail: {
      enabled: false,
    },
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "STUDENT",
        input: false,
      },
      active: {
        type: "boolean",
        required: true,
        defaultValue: true,
        input: false,
      },
      studentId: {
        type: "number",
        required: false,
        input: false,
      },
      teacherId: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;