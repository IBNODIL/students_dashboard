"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FlatRecord } from "@/lib/types";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AttendanceTableProps {
  records: FlatRecord[];
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  P: {
    label: "Present",
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700",
  },
  L: {
    label: "Late",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-700",
  },
  U: {
    label: "Absent",
    className:
      "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-700",
  },
  E: {
    label: "Excused",
    className:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-700",
  },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status];
  if (!config) {
    return (
      <Badge
        variant="outline"
        className="text-muted-foreground border-border text-xs"
      >
        —
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-semibold border", config.className)}
    >
      {status} · {config.label}
    </Badge>
  );
}

function AttendancePctBar({
  pct,
  size = "sm",
}: {
  pct: number;
  size?: "sm" | "xs";
}) {
  const color =
    pct >= 75
      ? "bg-emerald-500"
      : pct >= 50
      ? "bg-amber-500"
      : "bg-rose-500";

  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div
        className={cn(
          "flex-1 rounded-full bg-muted overflow-hidden",
          size === "xs" ? "h-1.5" : "h-2"
        )}
      >
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
      <span className="text-xs tabular-nums w-10 text-right">
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function AttendanceTable({
  records,
  total,
  page,
  totalPages,
  onPageChange,
  isLoading,
}: AttendanceTableProps) {
  return (
    <div className="rounded-xl border bg-card shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
      {/* Table header info */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <p className="text-sm font-medium">
          {isLoading ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading…
            </span>
          ) : (
            <span>
              <span className="font-bold">{total.toLocaleString()}</span>{" "}
              <span className="text-muted-foreground">attendance records</span>
            </span>
          )}
        </p>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          Page <span className="font-medium text-foreground">{page}</span> of{" "}
          <span className="font-medium text-foreground">{totalPages || 1}</span>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="bg-muted/20 hover:bg-muted/20">
            <TableHead className="w-[90px] text-xs">Student ID</TableHead>
            <TableHead className="min-w-[120px] text-xs">Name</TableHead>
            <TableHead className="min-w-[90px] text-xs">Group</TableHead>
            <TableHead className="min-w-[80px] text-xs">Subject</TableHead>
            <TableHead className="min-w-[140px] text-xs">Teacher</TableHead>
            <TableHead className="min-w-[90px] text-xs">Teacher ID</TableHead>
            <TableHead className="min-w-[110px] text-xs">Date</TableHead>
            <TableHead className="w-[80px] text-xs text-center">
              Time
            </TableHead>
            <TableHead className="w-[70px] text-xs text-center">
              Room
            </TableHead>
            <TableHead className="min-w-[120px] text-xs">Status</TableHead>
            <TableHead className="w-[60px] text-xs text-center">
              Pts
            </TableHead>
            <TableHead className="min-w-[130px] text-xs">
              Att. %
            </TableHead>
            <TableHead className="min-w-[130px] text-xs">
              Abs. %
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.length === 0 && !isLoading ? (
            <TableRow>
              <TableCell
                colSpan={13}
                className="h-32 text-center text-muted-foreground"
              >
                No records found. Try adjusting your filters.
              </TableCell>
            </TableRow>
          ) : (
            records.map((r, idx) => (
              <TableRow
                key={`${r.student_id}-${r.date}-${r.lesson_time}-${idx}`}
                className={cn(
                  "text-sm",
                  isLoading && "opacity-50 pointer-events-none"
                )}
              >
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {r.student_id}
                </TableCell>
                <TableCell className="font-medium">{r.student_name}</TableCell>
                <TableCell>
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-mono">
                    {r.group_name}
                  </span>
                </TableCell>
                <TableCell className="text-xs">{r.subject_name}</TableCell>
                <TableCell className="text-xs">{r.teacher_name}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {r.teacher_id}
                </TableCell>
                <TableCell className="text-xs tabular-nums">
                  {formatDate(r.date)}
                </TableCell>
                <TableCell className="text-center text-xs tabular-nums">
                  P{r.lesson_time}
                </TableCell>
                <TableCell className="text-center text-xs tabular-nums">
                  {r.lesson_room}
                </TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
                <TableCell className="text-center text-xs tabular-nums font-semibold">
                  {r.status === "L" ? "0.5" : r.points}
                </TableCell>
                <TableCell>
                  <AttendancePctBar
                    pct={r.student_attendance_pct}
                    size="xs"
                  />
                </TableCell>
                <TableCell>
                  <AttendancePctBar
                    pct={r.student_absence_pct}
                    size="xs"
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || isLoading}
            className="h-8 gap-1 text-xs"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Previous
          </Button>

          <div className="flex items-center gap-1">
            {/* First page */}
            {page > 3 && (
              <>
                <PageBtn n={1} current={page} onClick={onPageChange} />
                {page > 4 && (
                  <span className="text-muted-foreground text-xs px-1">
                    …
                  </span>
                )}
              </>
            )}

            {/* Window */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              return start + i;
            })
              .filter((n) => n >= 1 && n <= totalPages)
              .map((n) => (
                <PageBtn
                  key={n}
                  n={n}
                  current={page}
                  onClick={onPageChange}
                />
              ))}

            {/* Last page */}
            {page < totalPages - 2 && (
              <>
                {page < totalPages - 3 && (
                  <span className="text-muted-foreground text-xs px-1">
                    …
                  </span>
                )}
                <PageBtn
                  n={totalPages}
                  current={page}
                  onClick={onPageChange}
                />
              </>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || isLoading}
            className="h-8 gap-1 text-xs"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

function PageBtn({
  n,
  current,
  onClick,
}: {
  n: number;
  current: number;
  onClick: (n: number) => void;
}) {
  return (
    <Button
      variant={n === current ? "default" : "outline"}
      size="sm"
      onClick={() => onClick(n)}
      className={cn(
        "h-7 w-7 p-0 text-xs",
        n === current && "pointer-events-none"
      )}
    >
      {n}
    </Button>
  );
}
