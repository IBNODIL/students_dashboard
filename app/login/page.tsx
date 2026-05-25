import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  const requestHeaders = new Headers(await headers());

  const session = await auth.api.getSession({
    headers: requestHeaders,
  });

  if (session) {
    redirect("/");
  }

  return <LoginForm />;
}