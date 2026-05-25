import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { HomePageClient } from "@/components/home-page";

export default async function Home() {
  const requestHeaders = new Headers(await headers());

  const session = await auth.api.getSession({
    headers: requestHeaders,
  });

  if (!session) {
    redirect("/login");
  }

  return <HomePageClient />;
}