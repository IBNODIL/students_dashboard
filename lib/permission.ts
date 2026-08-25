import { Role } from "@/lib/prisma-enums";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

export const permissions: Record<
  Role,
  {
    create: Role[];
    update: Role[];
    delete: Role[];
  }
> = {
  SUPERADMIN: {
    create: ["SUPERADMIN", "ADMIN", "TEACHER", "STUDENT"],
    update: ["ADMIN", "TEACHER", "STUDENT"],
    delete: ["SUPERADMIN", "ADMIN", "TEACHER", "STUDENT"],
  },

  ADMIN: {
    create: ["TEACHER", "STUDENT"],
    update: ["TEACHER", "STUDENT"],
    delete: ["TEACHER", "STUDENT"],
  },

  TEACHER: {
    create: [],
    update: [],
    delete: [],
  },

  STUDENT: {
    create: [],
    update: [],
    delete: [],
  },
};

export function canManage(
  actor: Role,
  target: Role,
  action: "create" | "update" | "delete"
) {
  return permissions[actor][action].includes(target);
}

export function getPostLoginRedirect(user: {
  role: Role;
  studentId?: number | null;
}) {
  if (user.role === "STUDENT") {
    // Student profiles now live at /[publicKey] but login uses studentId
    // as a fallback until the publicKey lookup is done client-side.
    return typeof user.studentId === "number" ? `/${user.studentId}` : "/students";
  }
  // Admins and superadmins go to the dashboard overview at /
  return "/";
}

export async function requireAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const role = session.user.role as Role

  if (role !== "SUPERADMIN" && role !== "ADMIN") {
    redirect("/students");
  }

  return session;
}
