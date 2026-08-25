"use client";

import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StudentWithCourses } from "@/lib/types";
import { useLanguage } from "@/contexts/language-context";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  User,
  GraduationCap,
  ExternalLink,
} from "lucide-react";

interface StudentPanelsProps {
  students: StudentWithCourses[];
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

function MiniProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full", color)}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
      <span className="text-xs tabular-nums">{pct.toFixed(1)}%</span>
    </div>
  );
}

function formatTime(timeStr?: string | null): string {
  if (!timeStr) return "";
  try {
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

function AttendancePctColor(pct: number) {
  if (pct >= 75) return "text-emerald-600 dark:text-emerald-400";
  if (pct >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function StudentPanel({ student }: { student: StudentWithCourses }) {
  const publicKey = student.public_key;
  const { t } = useLanguage();
  const [selectedCourseIdx, setSelectedCourseIdx] = useState(0);
  const selectedCourse = student.courses[selectedCourseIdx];

  if (!selectedCourse) return null;

  // Real-time attendance status styling
  const getAttendanceStatusColor = (status?: string) => {
    switch (status) {
      case "here":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
      case "exit":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
      case "do not come":
        return "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getAttendanceStatusLabel = (status?: string) => {
    switch (status) {
      case "here":
        return t.statusHere;
      case "exit":
        return t.statusExit;
      case "do not come":
        return t.statusAbsent;
      default:
        return t.statusNoData;
    }
  };


  // Calculate overall stats across all courses for this student
  const overallStats = {
    present_count: student.courses.reduce((sum, c) => sum + c.present_count, 0),
    late_count: student.courses.reduce((sum, c) => sum + c.late_count, 0),
    absent_count: student.courses.reduce((sum, c) => sum + c.absent_count, 0),
    excused_count: student.courses.reduce((sum, c) => sum + c.excused_count, 0),
    total_points: student.courses.reduce((sum, c) => sum + c.total_points, 0),
    max_points: student.courses.reduce((sum, c) => sum + c.max_points, 0),
  };

  const overallAttendancePct = overallStats.max_points > 0
    ? (overallStats.total_points / overallStats.max_points) * 100
    : 0;

  const totalLessons = student.courses.reduce(
    (sum, c) => sum + c.attendances.length,
    0
  );

  return (
    <AccordionItem
      value={String(student.student_id)}
      className="rounded-xl border bg-card shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden mb-2 last:mb-0 not-last:border-b-0"
    >
      <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30 [&>svg]:hidden">
        <div className="flex flex-1 items-center gap-3 min-w-0">
          {/* Avatar */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-4 w-4" />
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="font-semibold text-sm truncate">
                {student.student_name}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                #{student.student_id}
              </span>
              {student.attendanceStatus && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs font-semibold border",
                    getAttendanceStatusColor(student.attendanceStatus.status)
                  )}
                  title={student.attendanceStatus.lastUpdated ? new Date(student.attendanceStatus.lastUpdated).toLocaleString() : undefined}
                >
                  {getAttendanceStatusLabel(student.attendanceStatus.status)}
                  {student.attendanceStatus.timeLog && (
                    <>
                      {" "}
                      <span className="font-mono text-[11px]">
                        {formatTime(student.attendanceStatus.timeLog)}
                      </span>
                    </>
                  )}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <GraduationCap className="h-3 w-3" />
                {student.group_name}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                {student.courses.length} {student.courses.length === 1 ? "course" : "courses"}
              </span>
            </div>
          </div>

          {/* Stats - overall from all courses */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-emerald-100 dark:bg-emerald-900/40 px-1.5 text-emerald-700 dark:text-emerald-300 font-semibold tabular-nums">
                {overallStats.present_count}P
              </span>
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-amber-100 dark:bg-amber-900/40 px-1.5 text-amber-700 dark:text-amber-300 font-semibold tabular-nums">
                {overallStats.late_count}L
              </span>
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-rose-100 dark:bg-rose-900/40 px-1.5 text-rose-700 dark:text-rose-300 font-semibold tabular-nums">
                {overallStats.absent_count}U
              </span>
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-blue-100 dark:bg-blue-900/40 px-1.5 text-blue-700 dark:text-blue-300 font-semibold tabular-nums">
                {overallStats.excused_count}E
              </span>
            </div>

            <div className="w-px h-5 bg-border" />

            {/* Overall Attendance % */}
            <div className="flex flex-col items-end gap-0.5">
              <span
                className={cn(
                  "text-sm font-bold tabular-nums",
                  AttendancePctColor(overallAttendancePct)
                )}
              >
                {overallAttendancePct.toFixed(1)}%
              </span>
              <span className="text-[10px] text-muted-foreground leading-none">
                {t.attendance}
              </span>
            </div>

            {/* Total lessons across all courses */}
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-sm font-semibold tabular-nums">
                {totalLessons}
              </span>
              <span className="text-[10px] text-muted-foreground leading-none">
                {t.lessons}
              </span>
            </div>

            {/* Profile Link */}
            <a
              href={publicKey ? `/${publicKey}` : "#"}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="ml-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="View profile in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          {/* Mobile */}
          <div className="flex sm:hidden flex-col items-end shrink-0">
            <span
              className={cn(
                "text-sm font-bold tabular-nums",
                AttendancePctColor(overallAttendancePct)
              )}
            >
              {overallAttendancePct.toFixed(1)}%
            </span>
            <span className="text-[10px] text-muted-foreground">{t.attMobile}</span>
          </div>

          {/* Chevron */}
          <svg
            className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-aria-expanded/accordion-trigger:rotate-180 ml-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </AccordionTrigger>

      <AccordionContent className="px-0 pb-0">
        <div className="border-t">
          {/* Profile Link Button (Mobile) */}
          <div className="sm:hidden px-4 py-3 border-b">
            <a
              href={publicKey ? `/${publicKey}` : "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-block"
            >
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                View Full Profile
              </Button>
            </a>
          </div>

          {/* Course selector */}
          {student.courses.length > 1 && (
            <>
              <div className="px-4 py-2 border-b">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Course Stats
                </p>
              </div>
              <div className="px-4 py-3 bg-muted/10 border-b flex flex-wrap gap-2">
                {student.courses.map((course, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedCourseIdx(idx)}
                    className={cn(
                      "px-3 py-1.5 rounded text-xs font-medium transition-colors",
                      idx === selectedCourseIdx
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {course.subject_name}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Progress bars */}
          <div className="px-4 py-3 bg-muted/20 flex flex-wrap gap-x-6 gap-y-2">
            {selectedCourse.echo_grades && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Grade
                </span>

                <MiniProgressBar
                  pct={selectedCourse.echo_grades.percentage}
                  color={
                    selectedCourse.echo_grades.percentage >= 80
                      ? "bg-emerald-500"
                      : selectedCourse.echo_grades.percentage >= 60
                        ? "bg-amber-500"
                        : "bg-rose-500"
                  }
                />
              </div>
            )}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {t.attendanceRate}
              </span>
              <MiniProgressBar
                pct={selectedCourse.attendance_pct}
                color="bg-emerald-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {t.absenceRate}
              </span>
              <MiniProgressBar
                pct={selectedCourse.absence_pct}
                color="bg-rose-500"
              />
            </div>
            <div className="text-xs text-muted-foreground self-end pb-0.5">
              {t.pointsSummary(
                selectedCourse.total_points.toFixed(1),
                selectedCourse.max_points,
                String(selectedCourse.teacher_name)
              )}
            </div>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem >
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

export function StudentPanels({
  students,
  total,
  page,
  totalPages,
  onPageChange,
  isLoading,
}: StudentPanelsProps) {
  const { t } = useLanguage();
  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between px-1">
        <p className="text-sm">
          {isLoading ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t.loading}
            </span>
          ) : (
            <span className="font-medium">{t.studentsFound(total)}</span>
          )}
        </p>
        {totalPages > 1 && (
          <span className="text-sm text-muted-foreground">
            {t.pageOf(page, totalPages)}
          </span>
        )}
      </div>

      {/* Student panels */}
      {students.length === 0 && !isLoading ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground text-sm">
          {t.noStudents}
        </div>
      ) : (
        <Accordion
          type="multiple"
          className={cn("space-y-2", isLoading && "opacity-50 pointer-events-none")}
        >
          {students.map((s) => (
            <StudentPanel key={s.student_id} student={s} />
          ))}
        </Accordion>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || isLoading}
            className="h-8 gap-1 text-xs"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            {t.previous}
          </Button>

          <div className="flex items-center gap-1">
            {page > 3 && (
              <>
                <PageBtn n={1} current={page} onClick={onPageChange} />
                {page > 4 && (
                  <span className="text-muted-foreground text-xs px-1">…</span>
                )}
              </>
            )}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              return start + i;
            })
              .filter((n) => n >= 1 && n <= totalPages)
              .map((n) => (
                <PageBtn key={n} n={n} current={page} onClick={onPageChange} />
              ))}
            {page < totalPages - 2 && (
              <>
                {page < totalPages - 3 && (
                  <span className="text-muted-foreground text-xs px-1">…</span>
                )}
                <PageBtn n={totalPages} current={page} onClick={onPageChange} />
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
            {t.next}
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
