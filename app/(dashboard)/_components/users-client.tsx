"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Plus,
  Search,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  MoreHorizontal,
  Pencil,
  KeyRound,
  UserCheck,
  UserX,
  Trash2,
  ShieldAlert,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ActionLoadingOverlay } from "./action-loading-overlay";

type Role = "SUPERADMIN" | "ADMIN" | "TEACHER" | "STUDENT";

interface UserRow {
  id: string;
  userNumber: number | null;
  email: string;
  name: string | null;
  role: Role;
  active: boolean;
  deletedAt: string | null;
  deleteAfter: string | null;
  teacherId: string | null;
  studentId: number | null;
  createdAt: string;
  teacher?: { name: string } | null;
  student?: { name: string } | null;
}

const ROLE_COLORS: Record<Role, string> = {
  SUPERADMIN: "bg-rose-100 text-rose-700",
  ADMIN: "bg-blue-100 text-blue-700",
  TEACHER: "bg-emerald-100 text-emerald-700",
  STUDENT: "bg-violet-100 text-violet-700",
};

const ALLOWED_TO_CREATE: Record<string, Role[]> = {
  SUPERADMIN: ["SUPERADMIN", "ADMIN", "TEACHER", "STUDENT"],
  ADMIN: ["TEACHER", "STUDENT"],
};

function formatRemainingTime(deleteAfter: string | null, now: Date) {
  if (!deleteAfter) return null;

  const diffMs = new Date(deleteAfter).getTime() - now.getTime();
  if (diffMs <= 0) return "Deletion due";

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

  return `${parts.join(" ")} remaining`;
}

export function UsersClient({ callerRole, callerId }: { callerRole: string; callerId: string }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetPasswordResult, setResetPasswordResult] = useState<{
    generatedPassword: string;
    userNumber: number | null;
    email: string;
    name: string | null;
  } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const isBusy = Boolean(actionMessage);
  const busyRef = useRef(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (roleFilter) params.set("role", roleFilter);
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to load users");
        return;
      }
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.total_pages ?? 1);
    } catch {
      toast.error("Something went wrong while loading users");
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const filtered = search
    ? users.filter(
      (u) =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    )
    : users;

  const beginAction = (message: string) => {
    if (busyRef.current) {
      return false;
    }
    busyRef.current = true;
    setActionMessage(message);
    return true;
  };

  const finishAction = () => {
    busyRef.current = false;
    setActionMessage(null);
  };

  const handleToggleActive = async (userId: string, current: boolean) => {
    if (!beginAction(current ? "Deactivating user..." : "Activating user...")) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !current }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to update user status");
        return;
      }
      toast.success(data.action === "ACTIVATE" ? "User activated" : "User deactivated");
      await fetchUsers();
    } catch {
      toast.error("Something went wrong");
    } finally {
      finishAction();
    }
  };

  const handleEditName = async (name: string) => {
    if (!selectedUser) return;

    if (!beginAction("Updating user...")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to update name");
        return;
      }

      toast.success("User name updated");
      setEditNameOpen(false);
      setSelectedUser(null);

      await fetchUsers();
    } catch {
      toast.error("Something went wrong");
    } finally {
      finishAction();
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;

    if (!beginAction("Resetting password...")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/reset-password`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to reset password");
        return;
      }

      toast.success("Password reset successfully");
      setResetPasswordResult({
        generatedPassword: data.generatedPassword,
        userNumber: data.user.userNumber,
        email: data.user.email,
        name: data.user.name,
      });
      setSelectedUser(null);
    } catch {
      toast.error("Something went wrong");
    } finally {
      finishAction();
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;

    if (!beginAction("Deleting user...")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to delete user");
        return;
      }

      toast.success(data.message ?? "User has been scheduled for deletion");

      setDeleteOpen(false);
      setSelectedUser(null);

      await fetchUsers();
    } catch {
      toast.error("Something went wrong");
    } finally {
      finishAction();
    }
  };

  const handleRecover = async (userId: string) => {
    if (!beginAction("Recovering user...")) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: true }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to recover user");
        return;
      }

      toast.success("User recovered successfully");
      await fetchUsers();
    } catch {
      toast.error("Something went wrong");
    } finally {
      finishAction();
    }
  };

  const handlePermanentDelete = async (userOverride?: UserRow) => {
    const targetUser = userOverride ?? selectedUser;
    if (!targetUser) {
      return;
    }

    if (!beginAction("Permanently deleting user...")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}/permanent`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to permanently delete user");
        return;
      }

      toast.success("User permanently deleted");
      setSelectedUser(null);
      await fetchUsers();
    } catch {
      toast.error("Something went wrong");
    } finally {
      finishAction();
    }
  };

  return (
    <div className="space-y-5">
      <ActionLoadingOverlay open={isBusy} message={actionMessage ?? "Working..."} description="Please wait until the current action completes." />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Users</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {total} total user{total !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          disabled={isBusy}
          className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          Create user
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={isBusy}
            placeholder="Search by name or email…"
            className="w-full pl-8 pr-3 h-9 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20 disabled:opacity-60"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          disabled={isBusy}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/20 disabled:opacity-60"
        >
          <option value="">All roles</option>
          {callerRole === "SUPERADMIN" && <option value="SUPERADMIN">Superadmin</option>}
          {callerRole === "SUPERADMIN" && <option value="ADMIN">Admin</option>}
          <option value="TEACHER">Teacher</option>
          <option value="STUDENT">Student</option>
        </select>
        <button
          onClick={fetchUsers}
          disabled={isBusy}
          className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">ID</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">User</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Role</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Linked to</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Created</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-slate-400 text-sm">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-slate-400 text-sm">
                  No users found.
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  {/* ID */}
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs font-semibold text-slate-600">
                      {u.userNumber}
                    </span>
                  </td>
                  {/* User */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                        {(u.name ?? u.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 leading-none">
                          {u.name ?? "—"}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{u.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold ${ROLE_COLORS[u.role]}`}>
                      {u.role}
                    </span>
                  </td>

                  {/* Linked to */}
                  <td className="px-5 py-3 text-xs text-slate-500">
                    {u.teacher ? (
                      <span className="text-emerald-700">Teacher: {u.teacher.name}</span>
                    ) : u.student ? (
                      <span className="text-violet-700">Student: {u.student.name}</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-5 py-3">
                    {u.deleteAfter ? (
                      <div className="space-y-1">
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                          Pending deletion
                        </span>
                        <p className="text-[11px] text-amber-600">
                          {formatRemainingTime(u.deleteAfter, now)}
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleToggleActive(u.id, u.active)}
                        disabled={isBusy || u.role === "SUPERADMIN"}
                        className="flex items-center gap-1.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                        title={u.active ? "Click to deactivate" : "Click to activate"}
                      >
                        {u.active ? (
                          <>
                            <ToggleRight className="h-4 w-4 text-emerald-500" />
                            <span className="text-emerald-700 font-medium">Active</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-400">Inactive</span>
                          </>
                        )}
                      </button>
                    )}
                  </td>

                  {/* Created */}
                  <td className="px-5 py-3 text-xs text-slate-400">
                    {new Date(u.createdAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          disabled={isBusy}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-100 transition-colors disabled:opacity-50"
                        >
                          <MoreHorizontal className="h-4 w-4 text-slate-500" />
                          <span className="sr-only">Open actions</span>
                        </button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end" className="w-48">

                        {/* Edit name */}
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser(u);
                            setEditNameOpen(true);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit name
                        </DropdownMenuItem>

                        {u.deleteAfter ? (
                          <>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(u);
                                setEditNameOpen(true);
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit name
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => handleRecover(u.id)}
                            >
                              <UserCheck className="mr-2 h-4 w-4 text-emerald-600" />
                              Recover
                            </DropdownMenuItem>

                            {callerRole === "SUPERADMIN" && (
                              <DropdownMenuItem
                                className="text-red-700 focus:text-red-700"
                                onClick={() => {
                                  setSelectedUser(u);
                                  void handlePermanentDelete(u);
                                }}
                              >
                                <ShieldAlert className="mr-2 h-4 w-4" />
                                Permanent delete
                              </DropdownMenuItem>
                            )}
                          </>
                        ) : (
                          <>
                            {/* Reset password */}
                            {u.id !== callerId && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(u);
                                  setResetPasswordOpen(true);
                                }}
                              >
                                <KeyRound className="mr-2 h-4 w-4" />
                                Reset password
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            {/* Activate */}
                            {!u.active && (
                              <DropdownMenuItem
                                onClick={async () => {
                                  await handleToggleActive(u.id, false);
                                }}
                              >
                                <UserCheck className="mr-2 h-4 w-4 text-emerald-600" />
                                Activate
                              </DropdownMenuItem>
                            )}

                            {/* Deactivate */}
                            {u.active && u.role !== "SUPERADMIN" && (
                              <DropdownMenuItem
                                onClick={async () => {
                                  await handleToggleActive(u.id, true);
                                }}
                              >
                                <UserX className="mr-2 h-4 w-4 text-amber-600" />
                                Deactivate
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            {/* Normal delete */}
                            {u.role !== "SUPERADMIN" && u.id !== callerId && (
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onClick={() => {
                                  setSelectedUser(u);
                                  setDeleteOpen(true);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            )}

                            {/* SUPERADMIN only */}
                            {callerRole === "SUPERADMIN" && u.id !== callerId && (
                              <DropdownMenuItem
                                className="text-red-700 focus:text-red-700"
                                onClick={() => {
                                  setSelectedUser(u);
                                  void handlePermanentDelete(u);
                                }}
                              >
                                <ShieldAlert className="mr-2 h-4 w-4" />
                                Permanent delete
                              </DropdownMenuItem>
                            )}
                          </>
                        )}

                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create user modal */}
      {showCreate && (
        <CreateUserModal
          callerRole={callerRole}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchUsers(); }}
        />
      )}

      {/* Edit name */}
      <EditNameDialog
        user={selectedUser}
        open={editNameOpen}
        onOpenChange={setEditNameOpen}
        loading={isBusy}
        onSave={handleEditName}
      />

      {/* Reset password */}
      <AlertDialog
        open={resetPasswordOpen}
        onOpenChange={(open) => {
          setResetPasswordOpen(open);
          if (!open) {
            setResetPasswordResult(null);
          }
        }}
      >
        <AlertDialogContent>
          {resetPasswordResult ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Password reset complete</AlertDialogTitle>
                <AlertDialogDescription>
                  Share the generated password securely. It will not be shown again.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <p><span className="text-slate-500">User ID:</span> {resetPasswordResult.userNumber ?? "—"}</p>
                <p><span className="text-slate-500">Email:</span> {resetPasswordResult.email}</p>
                <p><span className="text-slate-500">Password:</span> <span className="font-semibold text-slate-900">{resetPasswordResult.generatedPassword}</span></p>
              </div>
              <AlertDialogFooter>
                <AlertDialogAction onClick={() => setResetPasswordOpen(false)}>
                  Done
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset password?</AlertDialogTitle>
                <AlertDialogDescription>
                  A new password will be generated for{" "}
                  <strong>{selectedUser?.name ?? selectedUser?.email}</strong>.
                  The old password will stop working.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isBusy}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleResetPassword}
                  disabled={isBusy}
                >
                  Reset password
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete */}
      <AlertDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedUser?.name ?? "this user"}?
            </AlertDialogTitle>

            <AlertDialogDescription>
              The user will be deactivated and scheduled for deletion.
              The account will remain recoverable during the deletion period.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy}>
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={handleDelete}
              disabled={isBusy}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete user
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

// ── Create User Modal ─────────────────────────────────────────────────────────

function CreateUserModal({
  callerRole,
  onClose,
  onCreated,
}: {
  callerRole: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    email: "",
    name: "",
    role: (ALLOWED_TO_CREATE[callerRole]?.[0] ?? "STUDENT") as Role,
    teacherId: "",
    studentId: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; generatedPassword: string; userNumber: number | null } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const body: Record<string, unknown> = {
      email: form.email,
      name: form.name,
      role: form.role,
    };
    if (form.role === "TEACHER" && form.teacherId) body.teacherId = form.teacherId;
    if (form.role === "STUDENT" && form.studentId) body.studentId = Number(form.studentId);

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    let data;
    try {
      data = await res.json();
    } catch {
      data = {
        error: "Invalid response from server.",
      };
    }
    setLoading(false);

    if (!res.ok) {
      toast.error(data.error ?? "Something went wrong");
      return;
    }

    setCreated({
      email: data.user.email,
      generatedPassword: data.generatedPassword,
      userNumber: data.user.userNumber,
    });
  };

  if (created) {
    const copyPassword = async () => {
      try {
        await navigator.clipboard.writeText(created.generatedPassword);
        toast.success("Password copied to clipboard");
      } catch {
        toast.error("Unable to copy password");
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              ✓
            </div>
            <div>
              <p className="font-semibold text-slate-900">User created</p>
              <p className="text-sm text-slate-500">Share credentials securely</p>
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-2 font-mono text-sm">
            <div>
              <span className="text-slate-400 text-xs">User ID</span>
              <p className="text-slate-900 font-semibold">{created.userNumber ?? "—"}</p>
            </div>
            <div>
              <span className="text-slate-400 text-xs">Email</span>
              <p className="text-slate-900">{created.email}</p>
            </div>
            <div>
              <span className="text-slate-400 text-xs">Password (shown once)</span>
              <div className="flex items-center gap-2">
                <p className="text-slate-900 font-semibold">{created.generatedPassword}</p>
                <button
                  type="button"
                  onClick={copyPassword}
                  className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"
                  aria-label="Copy password"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          <p className="text-xs text-amber-600 mt-3">
            ⚠ This password will not be shown again. Copy it now.
          </p>
          <button
            onClick={onCreated}
            className="mt-4 w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <ActionLoadingOverlay open={loading} message="Creating user..." description="Please wait until the account is created." />
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-5 border-b border-slate-100">
          <p className="font-semibold text-slate-900">Create user</p>
          <p className="text-sm text-slate-500 mt-0.5">
            A password will be auto-generated.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">Full name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Xusnida Sotvoldiyeva"
              className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">Email</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="user@jdu.uz"
              className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">
              Role
            </label>

            <select
              value={form.role}
              onChange={(e) => {
                const nextRole = e.target.value as Role;
                setForm((f) => ({
                  ...f,
                  role: nextRole,
                  teacherId: nextRole === "TEACHER" ? f.teacherId : "",
                  studentId: nextRole === "STUDENT" ? f.studentId : "",
                }));
              }}
              className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            >
              {(ALLOWED_TO_CREATE[callerRole] ?? []).map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>

            <p className="text-xs text-slate-400">
              Role cannot be changed after the account is created.
            </p>
          </div>

          {form.role === "TEACHER" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">
                Teacher ID <span className="text-slate-400">(from teachers table)</span>
              </label>
              <input
                required
                value={form.teacherId}
                onChange={(e) => setForm((f) => ({ ...f, teacherId: e.target.value }))}
                placeholder="e.g. JDU1362"
                className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              />
            </div>
          )}

          {form.role === "STUDENT" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">
                Student ID <span className="text-slate-400">(numeric ID from students table)</span>
              </label>
              <input
                required
                type="number"
                value={form.studentId}
                onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
                placeholder="e.g. 2500426"
                className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              />
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-9 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-9 rounded-lg bg-slate-900 text-sm font-medium text-white hover:bg-slate-700 transition-colors disabled:opacity-60"
            >
              {loading ? "Creating…" : "Create user"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditNameDialog({
  user,
  open,
  onOpenChange,
  loading,
  onSave,
}: {
  user: UserRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = name.trim();

    if (!trimmed) {
      toast.error("Name cannot be empty");
      return;
    }

    onSave(trimmed);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit name</DialogTitle>

          <DialogDescription>
            Change the name of {user?.email}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Full name
            </label>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-9 rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              placeholder="Full name"
              autoFocus
            />
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="rounded-md border px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save changes"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}