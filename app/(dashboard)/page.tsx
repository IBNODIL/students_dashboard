import Link from "next/link";
import { requireAdmin } from "@/lib/permission";
import { getPrisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await requireAdmin();
  const prisma = getPrisma();

  const [
    studentsCount,
    usersCount,
    auditCount,
    recentAuditLogs,
  ] = await Promise.all([
    prisma.student.count(),

    prisma.user.count(),

    prisma.auditLog.count(),

    prisma.auditLog.findMany({
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        actor: {
          select: {
            name: true,
            email: true,
            role: true,
          },
        },
        targetUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Dashboard Overview
        </h1>

        <p className="text-muted-foreground">
          Welcome back, {session.user.name ?? "User"}.
        </p>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Total Students
          </p>

          <p className="mt-2 text-3xl font-bold">
            {studentsCount}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Total Users
          </p>

          <p className="mt-2 text-3xl font-bold">
            {usersCount}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Audit Events
          </p>

          <p className="mt-2 text-3xl font-bold">
            {auditCount}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            System Status
          </p>

          <p className="mt-2 text-lg font-semibold">
            Active
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-xl font-semibold">
            Quick Actions
          </h2>

          <div className="mt-4 grid gap-3">
            <Link
              href="/students"
              className="rounded-lg border p-4 transition-colors hover:bg-muted"
            >
              Manage Students →
            </Link>

            <Link
              href="/users"
              className="rounded-lg border p-4 transition-colors hover:bg-muted"
            >
              Manage Users →
            </Link>

            <Link
              href="/history"
              className="rounded-lg border p-4 transition-colors hover:bg-muted"
            >
              View History →
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Recent Activity
            </h2>

            <Link
              href="/history"
              className="text-sm text-muted-foreground hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="mt-4 space-y-4">
            {recentAuditLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No recent activity.
              </p>
            ) : (
              recentAuditLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between gap-4 border-b pb-3 last:border-0"
                >
                  <div>
                    <p className="font-medium">
                      {log.action.replaceAll("_", " ")}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      {log.actor.name ??
                        log.actor.email ??
                        "Unknown user"}
                    </p>

                    {log.targetUser && (
                      <p className="text-xs text-muted-foreground">
                        Target:{" "}
                        {log.targetUser.name ??
                          log.targetUser.email ??
                          "Unknown user"}
                      </p>
                    )}
                  </div>

                  <p className="whitespace-nowrap text-xs text-muted-foreground">
                    {log.createdAt.toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}