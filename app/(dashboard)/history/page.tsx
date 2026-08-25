"use client";

import { useCallback, useEffect, useState } from "react";
import {
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "RESET_PASSWORD"
  | "DEACTIVATE"
  | "ACTIVATE"
  | "DELETE"
  | "PERMANENT_DELETE";

interface AuditUser {
  id: string;
  userNumber: number | null;
  name: string | null;
  email: string | null;
  role: string | null;
}

interface AuditLog {
  id: string;
  action: AuditAction;
  description: string;
  oldData: unknown;
  newData: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  actor: AuditUser;
  targetUser: AuditUser | null;
}

const ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: "Created",
  UPDATE: "Updated",
  RESET_PASSWORD: "Password reset",
  ACTIVATE: "Activated",
  DEACTIVATE: "Deactivated",
  DELETE: "Deleted",
  PERMANENT_DELETE: "Permanently deleted",
};

const ACTION_STYLES: Record<AuditAction, string> = {
  CREATE: "bg-emerald-100 text-emerald-700",
  UPDATE: "bg-blue-100 text-blue-700",
  RESET_PASSWORD: "bg-amber-100 text-amber-700",
  ACTIVATE: "bg-emerald-100 text-emerald-700",
  DEACTIVATE: "bg-slate-100 text-slate-600",
  DELETE: "bg-orange-100 text-orange-700",
  PERMANENT_DELETE: "bg-rose-100 text-rose-700",
};

export default function HistoryPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [action, setAction] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);

  const limit = 20;

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (action) {
        params.set("action", action);
      }

      const res = await fetch(`/api/admin/audit-logs?${params}`);

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load audit history");
      }

      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.total_pages ?? 1);
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load audit history"
      );
    } finally {
      setLoading(false);
    }
  }, [page, action]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = search.trim()
    ? logs.filter((log) => {
      const query = search.toLowerCase();


      return (
        log.description.toLowerCase().includes(query) ||
        log.actor.name?.toLowerCase().includes(query) ||
        log.actor.email?.toLowerCase().includes(query) ||
        String(log.actor.userNumber ?? "").includes(query) ||
        log.targetUser?.name?.toLowerCase().includes(query) ||
        log.targetUser?.email?.toLowerCase().includes(query) ||
        String(log.targetUser?.userNumber ?? "").includes(query)
      );
    })
    : logs;


  return (
    <div className="flex h-full flex-col space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Audit History</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Track user management activity.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search history…"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20"
          />
        </div>

        {/* Action filter */}
        <select
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
        >
          <option value="">All actions</option>
          <option value="CREATE">Created</option>
          <option value="UPDATE">Updated</option>
          <option value="RESET_PASSWORD">Password reset</option>
          <option value="ACTIVATE">Activated</option>
          <option value="DEACTIVATE">Deactivated</option>
          <option value="DELETE">Deleted</option>
          <option value="PERMANENT_DELETE">Permanently deleted</option>
        </select>

        {/* Refresh */}
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      <div className="text-xs text-slate-400">
        {total} total entr{total === 1 ? "y" : "ies"}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="h-full overflow-y-auto overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Action
                </th>

                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Performed by
                </th>

                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Target user
                </th>

                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Description
                </th>

                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Date
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-16 text-center text-sm text-slate-400"
                  >
                    Loading history…
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-16 text-center text-sm text-slate-400"
                  >
                    No audit history found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="transition-colors hover:bg-slate-50"
                  >
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${ACTION_STYLES[log.action]}`}
                      >
                        {ACTION_LABELS[log.action]}
                      </span>
                    </td>

                    <td className="px-5 py-3">
                      <div>
                        <p className="font-medium text-slate-900">
                          {log.actor.name ?? "Deleted user"}
                        </p>

                        <p className="text-xs text-slate-400">
                          {log.actor.userNumber
                            ? `#${log.actor.userNumber}`
                            : log.actor.email ?? "Unknown"}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-3">
                      {log.targetUser ? (
                        <div>
                          <p className="font-medium text-slate-900">
                            {log.targetUser.name ?? "—"}
                          </p>

                          <p className="text-xs text-slate-400">
                            {log.targetUser.userNumber
                              ? `#${log.targetUser.userNumber}`
                              : log.targetUser.email ?? "Unknown"}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    <td className="max-w-md px-5 py-3">
                      <p className="truncate text-sm text-slate-600">
                        {log.description}
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-5 py-3 text-xs text-slate-400">
                      <div>
                        {new Date(log.createdAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>

                      <div className="mt-0.5">
                        {new Date(log.createdAt).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
            <p className="text-xs text-slate-400">
              Page {page} of {totalPages}
            </p>

            <div className="flex gap-2">
              <button
                onClick={() =>
                  setPage((current) => Math.max(1, current - 1))
                }
                disabled={page <= 1 || loading}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>

              <button
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                disabled={page >= totalPages || loading}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
