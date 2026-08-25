"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import {
  Users,
  LayoutDashboard,
  LogOut,
  ChevronRight,
  History,
  Shield,
  Database,
  GraduationCap,
} from "lucide-react";

interface SessionUser {
  id: string;
  name?: string | null;
  email: string;
  role?: string;
  studentId?: number | null;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    authClient.getSession().then((res) => {
      if (!active) {
        return;
      }

      const u = res?.data?.user as SessionUser | undefined;
      if (!u) {
        router.replace("/login");
        return;
      }
      if (u.role === "STUDENT") {
        router.replace(`/${u.studentId ?? ""}`);
        return;
      }
      if (u.role !== "ADMIN" && u.role !== "SUPERADMIN") {
        router.replace("/students");
        return;
      }
      setUser(u);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [router]);

  const handleLogout = async () => {
    await authClient.signOut();
    router.replace("/login");
  };

  const nav = [
    { href: "/", label: "Overview", icon: LayoutDashboard },
    { href: "/users", label: "Users", icon: Users },
    { href: "/seed", label: "Seed", icon: Database },
    { href: "/history", label: "History", icon: History },
    { href: "/students", label: "Students", icon: GraduationCap },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
          <p className="text-sm text-slate-500">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-screen min-h-dvh flex overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-white border-r border-slate-200 flex flex-col">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white text-xs font-bold">
              SA
            </div>
            <div>
              <p className="text-sm font-semibold leading-none text-slate-900">
                Admin Panel
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 capitalize">
                {user?.role?.toLowerCase()}
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {nav.map(({ href, label, icon: Icon }) => {
            // "/" and "/students" need exact matching to avoid
            // highlighting on every path
            const active =
              href === "/" || href === "/students"
                ? pathname === href
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="px-3 py-3 border-t border-slate-100">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600 text-xs font-semibold">
              {user?.name?.[0]?.toUpperCase() ?? user?.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-900 truncate">
                {user?.name ?? user?.email}
              </p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-1 w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-8 py-3 flex items-center gap-2 text-xs text-slate-400">
          <Shield className="h-3.5 w-3.5" />
          <span>Dashboard</span>
          {pathname !== "/" && (
            <>
              <ChevronRight className="h-3 w-3" />
              <span className="capitalize text-slate-600">
                {pathname.split("/").pop()}
              </span>
            </>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-8 py-6">{children}</div>
      </main>
    </div>
  );
}
