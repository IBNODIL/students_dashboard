"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { StudentWithCourses } from "@/lib/types";
import { overallLmsPercentFromCourses, courseLmsPercent } from "@/lib/grades";
import {
  Loader2,
  BookOpen,
  GraduationCap,
  Calendar,
  ClipboardList,
  Award,
  ChevronDown,
} from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  P: {
    label: "Present",
    color:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  L: {
    label: "Late",
    color:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  },
  U: {
    label: "Absent",
    color: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  },
  E: {
    label: "Excused",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  },
  "": {
    label: "No mark",
    color: "bg-muted text-muted-foreground",
  },
};

function getStatusColor(pct: number): string {
  if (pct >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (pct >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")}/${d.getFullYear()}`;
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

// Displays credit totals as whole natural numbers (e.g. 12.4 -> 12, 12.6 -> 13).
// Purely a display-time transform; underlying credit values/calculations are untouched.
function formatCredits(value: number): number {
  return Math.round(value);
}

function OverallPercentBall({
  percent,
  size = 56,
}: {
  percent: number | null;
  size?: number;
}) {
  const stroke = 3;
  const r = size / 2 - stroke * 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  if (percent === null || Number.isNaN(percent)) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-full border-2 border-dashed border-muted bg-muted/25 text-[10px] font-medium leading-tight text-muted-foreground text-center px-1"
        style={{ width: size, height: size }}
        title="Not enough scored items to compute a percentage"
      >
        n/a
      </div>
    );
  }

  const v = Math.min(100, Math.max(0, percent));
  const offset = circumference - (v / 100) * circumference;
  const strokeClass =
    v >= 80
      ? "stroke-emerald-500 dark:stroke-emerald-400"
      : v >= 60
        ? "stroke-amber-500 dark:stroke-amber-400"
        : "stroke-rose-500 dark:stroke-rose-400";

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      title={`${v.toFixed(1)}%`}
    >
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          className="stroke-muted-foreground/25"
          strokeWidth={stroke}
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          className={cn(strokeClass, "transition-[stroke-dashoffset] duration-500")}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-sm font-bold leading-none tabular-nums", getStatusColor(v))}>
          {v.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

export default function StudentProfilePage() {
  const params = useParams();
  const studentKey = params.publicKey as string;

  const [student, setStudent] = useState<StudentWithCourses | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openAttendanceCourse, setOpenAttendanceCourse] = useState<string | null>(null);
  const [openGradesCourse, setOpenGradesCourse] = useState<string | null>(null);
  const [openCreditDepartment, setOpenCreditDepartment] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/students/${studentKey}`);
        if (!res.ok) {
          throw new Error(
            res.status === 404 ? "Student not found" : "Failed to fetch student"
          );
        }
        const data: StudentWithCourses = await res.json();
        setStudent(data);
        setError(null);
      } catch (err) {
        setError((err as Error).message);
        setStudent(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (studentKey) {
      fetchStudent();
    }
  }, [studentKey]);

  const attendanceBallPct = useMemo(() => {
    if (!student) return null;
    const max_points = student.courses.reduce((s, c) => s + c.max_points, 0);
    if (max_points <= 0) return null;
    const total_points = student.courses.reduce((s, c) => s + c.total_points, 0);
    return (total_points / max_points) * 100;
  }, [student]);

  const overallLmsPct = useMemo(
    () => (student ? overallLmsPercentFromCourses(student.courses) : null),
    [student]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading student profile...</p>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6 max-w-md w-full">
          <div className="text-center space-y-4">
            <p className="text-lg font-semibold text-muted-foreground">
              {error || "Student not found"}
            </p>
            <Link href="/students" className="w-full inline-block">
              <Button variant="outline" className="w-full">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const overallStats = {
    present_count: student.courses.reduce((sum, c) => sum + c.present_count, 0),
    late_count: student.courses.reduce((sum, c) => sum + c.late_count, 0),
    absent_count: student.courses.reduce((sum, c) => sum + c.absent_count, 0),
    excused_count: student.courses.reduce((sum, c) => sum + c.excused_count, 0),
    total_points: student.courses.reduce((sum, c) => sum + c.total_points, 0),
    max_points: student.courses.reduce((sum, c) => sum + c.max_points, 0),
  };

  const coursesWithLms = student.courses.filter((c) => c.echo_grades);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="p-5 mb-6">
          <div className="flex items-start gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border">
              <Image
                src={`/photos/${student.student_id}.jpg`}
                alt={student.student_name}
                fill
                className="object-cover"
                sizes="64px"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold tracking-tight">{student.student_name}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                ID{" "}
                <span className="font-mono font-semibold text-foreground">
                  #{student.student_id}
                </span>
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {student.attendanceStatus && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs font-semibold border",
                      student.attendanceStatus.status === "here"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : student.attendanceStatus.status === "exit"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                          : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
                    )}
                    title={student.attendanceStatus.lastUpdated ? new Date(student.attendanceStatus.lastUpdated).toLocaleString() : undefined}
                  >
                    {student.attendanceStatus.status === "here"
                      ? "Here"
                      : student.attendanceStatus.status === "exit"
                        ? "Exit"
                        : "Absent"}
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
                <Badge variant="secondary" className="gap-1 max-w-full truncate">
                  <GraduationCap className="h-3 w-3 shrink-0" />
                  <span className="truncate">{student.group_name}</span>
                </Badge>
                <Badge variant="outline" className="gap-1 shrink-0">
                  <BookOpen className="h-3 w-3" />
                  {student.courses.length} course{student.courses.length !== 1 ? "s" : ""}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        <Accordion
          type="single"
          collapsible
          defaultValue="attendance"
          className="space-y-3"
        >
          {/* ——— Attendance → courses ——— */}
          <AccordionItem
            value="attendance"
            className="rounded-xl border bg-card px-4 shadow-sm"
          >
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex flex-1 items-center justify-between gap-3 min-w-0 pr-2">
                <div className="flex items-center gap-3 min-w-0">
                  <Calendar className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="text-left min-w-0">
                    <p className="font-semibold">Attendance</p>
                    <p className="text-xs text-muted-foreground font-normal">
                      Valid sessions only (P, L, U, E) · per course
                    </p>
                  </div>
                </div>
                <OverallPercentBall percent={attendanceBallPct} />
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 overflow-visible">
              <div className="space-y-4 border-t pt-4">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Present</p>
                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                      {overallStats.present_count}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Late</p>
                    <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                      {overallStats.late_count}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Absent</p>
                    <p className="text-xl font-bold text-rose-600 dark:text-rose-400">
                      {overallStats.absent_count}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Excused</p>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {overallStats.excused_count}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3 col-span-2 sm:col-span-1">
                    <p className="text-xs text-muted-foreground">Sessions counted</p>
                    <p className="text-xl font-bold tabular-nums">{overallStats.max_points}</p>
                  </div>
                </div>

                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  By course
                </p>
                <div className="space-y-2">
                  {student.courses.map((course, idx) => {
                    const courseKey = `att-${course.subject_name}-${idx}`;
                    const sortedAttendances = [...course.attendances].sort(
                      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
                    );
                    return (
                      <details
                        key={courseKey}
                        open={openAttendanceCourse === courseKey}
                        onToggle={(event) => {
                          if (event.currentTarget.open) {
                            setOpenAttendanceCourse(courseKey);
                          } else {
                            setOpenAttendanceCourse((current) =>
                              current === courseKey ? null : current
                            );
                          }
                        }}
                        className="disclosure-panel rounded-lg border bg-muted/10"
                      >
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 outline-none [&::-webkit-details-marker]:hidden">
                          <div className="min-w-0 flex-1 text-left">
                            <p className="font-medium leading-snug">{course.subject_name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {course.teacher_name}
                              {course.group_name ? ` · ${course.group_name}` : ""}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span
                              className={cn(
                                "text-sm font-bold tabular-nums",
                                getStatusColor(course.attendance_pct)
                              )}
                            >
                              {course.attendance_pct.toFixed(1)}%
                            </span>
                            <ChevronDown className="disclosure-chevron h-4 w-4 text-muted-foreground" />
                          </div>
                        </summary>
                        <div className="border-t px-3 pb-3 pt-2 space-y-3">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div className="rounded-md bg-background px-2 py-2 text-center border">
                              <p className="text-[10px] text-muted-foreground uppercase">Present</p>
                              <p className="text-base font-semibold text-emerald-600 dark:text-emerald-400">
                                {course.present_count}
                              </p>
                            </div>
                            <div className="rounded-md bg-background px-2 py-2 text-center border">
                              <p className="text-[10px] text-muted-foreground uppercase">Late</p>
                              <p className="text-base font-semibold text-amber-600 dark:text-amber-400">
                                {course.late_count}
                              </p>
                            </div>
                            <div className="rounded-md bg-background px-2 py-2 text-center border">
                              <p className="text-[10px] text-muted-foreground uppercase">Absent</p>
                              <p className="text-base font-semibold text-rose-600 dark:text-rose-400">
                                {course.absent_count}
                              </p>
                            </div>
                            <div className="rounded-md bg-background px-2 py-2 text-center border">
                              <p className="text-[10px] text-muted-foreground uppercase">Excused</p>
                              <p className="text-base font-semibold text-blue-600 dark:text-blue-400">
                                {course.excused_count}
                              </p>
                            </div>
                          </div>
                          <div className="overflow-x-auto rounded-md border bg-background">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead className="text-center">Time</TableHead>
                                  <TableHead className="text-center">Room</TableHead>
                                  <TableHead className="text-center w-14">Pts</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {sortedAttendances.length === 0 ? (
                                  <TableRow>
                                    <TableCell
                                      colSpan={5}
                                      className="text-center py-6 text-muted-foreground text-sm"
                                    >
                                      No attendance records
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  sortedAttendances.map((att, attIdx) => {
                                    const statusInfo =
                                      STATUS_LABELS[
                                      att.status as keyof typeof STATUS_LABELS
                                      ] ?? {
                                        label: "Unknown",
                                        color: "bg-muted text-muted-foreground",
                                      };
                                    return (
                                      <TableRow key={attIdx}>
                                        <TableCell className="font-medium text-sm">
                                          {formatDate(att.date)}
                                        </TableCell>
                                        <TableCell>
                                          <Badge
                                            className={cn(
                                              "text-xs font-medium border",
                                              statusInfo.color
                                            )}
                                          >
                                            {att.status || "—"} · {statusInfo.label}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="text-center text-sm tabular-nums">
                                          {att.lesson_time}:00
                                        </TableCell>
                                        <TableCell className="text-center text-sm tabular-nums">
                                          {att.lesson_room}
                                        </TableCell>
                                        <TableCell className="text-center font-semibold text-sm tabular-nums">
                                          {att.points}
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </details>
                    );
                  })}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* ——— Grades (LMS) → courses ——— */}
          <AccordionItem
            value="grades"
            className="rounded-xl border bg-card px-4 shadow-sm"
          >
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex flex-1 items-center justify-between gap-3 min-w-0 pr-2">
                <div className="flex items-center gap-3 min-w-0">
                  <ClipboardList className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="text-left min-w-0">
                    <p className="font-semibold">Grades (LMS)</p>
                    <p className="text-xs text-muted-foreground font-normal">
                      Only rows with numeric scores (excludes “-”, empty, text) · per course
                    </p>
                  </div>
                </div>
                <OverallPercentBall percent={overallLmsPct} />
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 overflow-visible space-y-4">
              <div className="border-t pt-4 space-y-2">
                {coursesWithLms.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    No LMS grade blocks for this student.
                  </p>
                ) : (
                  coursesWithLms.map((course, idx) => {
                    const courseKey = `lms-${course.subject_name}-${idx}`;
                    const pct = courseLmsPercent(course);
                    return (
                      <details
                        key={courseKey}
                        open={openGradesCourse === courseKey}
                        onToggle={(event) => {
                          if (event.currentTarget.open) {
                            setOpenGradesCourse(courseKey);
                          } else {
                            setOpenGradesCourse((current) =>
                              current === courseKey ? null : current
                            );
                          }
                        }}
                        className="disclosure-panel rounded-lg border bg-muted/10"
                      >
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 outline-none [&::-webkit-details-marker]:hidden">
                          <div className="min-w-0 flex-1 text-left">
                            <p className="font-medium leading-snug">{course.subject_name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {course.teacher_name}
                              {course.group_name ? ` · ${course.group_name}` : ""}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {pct !== null ? (
                              <span
                                className={cn(
                                  "text-sm font-bold tabular-nums",
                                  getStatusColor(pct)
                                )}
                              >
                                {pct.toFixed(0)}%
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">n/a</span>
                            )}
                            <ChevronDown className="disclosure-chevron h-4 w-4 text-muted-foreground" />
                          </div>
                        </summary>
                        <div className="border-t px-3 pb-3 pt-2 space-y-3">
                          {course.echo_grades ? (
                            <>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div className="rounded-lg border bg-background p-3">
                                  <p className="text-xs text-muted-foreground">Earned (total)</p>
                                  <p className="text-lg font-bold tabular-nums">
                                    {course.echo_grades.total_current_grade}
                                  </p>
                                </div>
                                <div className="rounded-lg border bg-background p-3">
                                  <p className="text-xs text-muted-foreground">Maximum (total)</p>
                                  <p className="text-lg font-bold tabular-nums">
                                    {course.echo_grades.total_full_grade}
                                  </p>
                                </div>
                                <div className="rounded-lg border bg-background p-3">
                                  <p className="text-xs text-muted-foreground">Reported %</p>
                                  <p
                                    className={cn(
                                      "text-lg font-bold tabular-nums",
                                      getStatusColor(course.echo_grades.percentage)
                                    )}
                                  >
                                    {course.echo_grades.percentage.toFixed(0)}%
                                  </p>
                                </div>
                              </div>
                              {course.echo_grades.assignments.length > 0 ? (
                                <div className="overflow-x-auto rounded-md border bg-background">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Assignment</TableHead>
                                        <TableHead className="text-center w-20">Score</TableHead>
                                        <TableHead className="text-center w-14">Max</TableHead>
                                        <TableHead className="w-28">Due</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {course.echo_grades.assignments.map((as, i) => (
                                        <TableRow key={`${as.title}-${i}`}>
                                          <TableCell className="font-medium max-w-[200px] truncate">
                                            {as.title}
                                          </TableCell>
                                          <TableCell className="text-center text-sm tabular-nums">
                                            {String(as.current_grade)}
                                          </TableCell>
                                          <TableCell className="text-center tabular-nums text-sm">
                                            {as.full_grade}
                                          </TableCell>
                                          <TableCell className="text-muted-foreground text-xs">
                                            {as.assignment_deadline === "-"
                                              ? "—"
                                              : formatDate(as.assignment_deadline)}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">No assignment rows.</p>
                              )}
                            </>
                          ) : null}
                        </div>
                      </details>
                    );
                  })
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* ——— Credits (university transcript) ——— */}
          <AccordionItem
            value="credits"
            className="rounded-xl border bg-card px-4 shadow-sm"
          >
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex flex-1 items-center justify-between gap-3 min-w-0 pr-2">
                <div className="flex items-center gap-3 min-w-0">
                  <Award className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="text-left min-w-0">
                    <p className="font-semibold">Credits</p>
                    <p className="text-xs text-muted-foreground font-normal">
                      University transcript · credits passed by department
                    </p>
                  </div>
                </div>
                {student.gradesData && (
                  <span
                    className={cn(
                      "text-sm font-bold tabular-nums",
                      getStatusColor(student.gradesData.totals?.percentage_passed || 0)
                    )}
                  >
                    {Math.round(student.gradesData.totals?.percentage_passed || 0)}%
                  </span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 overflow-visible">
              <div className="border-t pt-4 space-y-4">
                {student.gradesData ? (
                  <>
                    {/* Summary cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-4 bg-muted/40 rounded-lg border">
                        <p className="text-xs text-muted-foreground mb-2">Credits passed</p>
                        <p className="text-2xl font-bold">
                          {formatCredits(student.gradesData.totals?.total_credits_passed || 0)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          of {formatCredits(student.gradesData.totals?.total_credits_graded || 0)}
                        </p>
                      </div>
                      <div className="p-4 bg-muted/40 rounded-lg border">
                        <p className="text-xs text-muted-foreground mb-2">Total credits</p>
                        <p className="text-2xl font-bold">
                          {formatCredits(student.gradesData.totals?.total_credits_graded || 0)}
                        </p>
                      </div>
                      <div className="p-4 bg-muted/40 rounded-lg border">
                        <p className="text-xs text-muted-foreground mb-2">Pass rate</p>
                        <p className={cn("text-2xl font-bold", getStatusColor(student.gradesData.totals?.percentage_passed || 0))}>
                          {Math.round(student.gradesData.totals?.percentage_passed || 0)}%
                        </p>
                      </div>
                    </div>

                    {/* Department rows — each collapsible, showing letter grades inside */}
                    {Object.entries(student.gradesData.by_department || {})
                      .filter(([, dept]) => dept.total_credits_graded > 0)
                      .map(([deptName, dept]) => {
                        const deptCourses = student.gradesData?.grades?.[deptName] ?? {};
                        const filteredCourses = Object.entries(deptCourses).filter(
                          ([key]) => key !== "Co-work Rank"
                        );
                        return (
                          <details
                            key={deptName}
                            open={openCreditDepartment === deptName}
                            onToggle={(event) => {
                              if (event.currentTarget.open) {
                                setOpenCreditDepartment(deptName);
                              } else {
                                setOpenCreditDepartment((current) =>
                                  current === deptName ? null : current
                                );
                              }
                            }}
                            className="disclosure-panel rounded-lg border bg-muted/10"
                          >
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 outline-none [&::-webkit-details-marker]:hidden">
                              <div className="min-w-0 flex-1 text-left">
                                <p className="font-medium leading-snug">{deptName}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {formatCredits(dept.total_credits_passed)} / {formatCredits(dept.total_credits_graded)} credits passed
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <span className={cn("text-sm font-bold tabular-nums", getStatusColor(dept.percentage_passed))}>
                                  {Math.round(dept.percentage_passed)}%
                                </span>
                                <ChevronDown className="disclosure-chevron h-4 w-4 text-muted-foreground" />
                              </div>
                            </summary>
                            <div className="border-t px-3 pb-3 pt-2">
                              {filteredCourses.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  {filteredCourses.map(([course, grade]) => (
                                    <div
                                      key={course}
                                      className="text-xs bg-background p-2 rounded border"
                                    >
                                      <p className="font-medium truncate">{course}</p>
                                      <p className={cn(
                                        "font-bold mt-0.5",
                                        grade === "A"
                                          ? "text-emerald-600 dark:text-emerald-400"
                                          : ["B", "C"].includes(grade)
                                            ? "text-amber-600 dark:text-amber-400"
                                            : "text-rose-600 dark:text-rose-400"
                                      )}>
                                        {grade}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground py-2">No course grades available.</p>
                              )}
                            </div>
                          </details>
                        );
                      })}

                    {Object.keys(student.gradesData.by_department || {}).length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">
                        No department breakdown available.
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground py-2">
                    No university transcript data available for this student yet.
                  </p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
