import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Role } from "@/lib/prisma-enums";

import { auth } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";
import { getPostLoginRedirect } from "@/lib/permission";

export default async function LoginPage() {
  const requestHeaders = new Headers(await headers());

  const session = await auth.api.getSession({
    headers: requestHeaders,
  });

  if (session) {
    const redirectTarget = getPostLoginRedirect({
      role: session.user.role as Role,
      studentId: session.user.studentId,
    });
    redirect(redirectTarget);
  }

  return <LoginForm />;
}