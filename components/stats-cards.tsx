"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AttendanceStats } from "@/lib/types";
import { useLanguage } from "@/contexts/language-context";
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  BookOpen,
  TrendingUp,
} from "lucide-react";

interface StatsCardsProps {
  stats: AttendanceStats;
}

function ProgressBar({
  value,
  color,
}: {
  value: number;
  color: string;
}) {
  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function StatsCards({ stats }: StatsCardsProps) {
  const { t } = useLanguage();
  const attendancePct = stats.attendance_pct.toFixed(1);
  const absencePct = stats.absence_pct.toFixed(1);

  return (
    <div className="space-y-4">
      {/* Main attendance overview banner */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        {/* Present % */}
        <Card className="border-0 bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-950/40 dark:to-green-900/40 ring-1 ring-emerald-200 dark:ring-emerald-800">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-emerald-800 dark:text-emerald-200">
              <span className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                {t.attendanceRate}
              </span>
              <span className="text-3xl font-bold tabular-nums">
                {attendancePct}%
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ProgressBar value={stats.attendance_pct} color="bg-emerald-500" />
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              {t.basedOnPoints(
                stats.total_points.toFixed(1),
                stats.max_points,
                stats.present_count,
                stats.excused_count,
                stats.late_count
              )}
            </p>
          </CardContent>
        </Card>

        {/* Absent % */}
        <Card className="border-0 bg-gradient-to-br from-rose-50 to-red-100 dark:from-rose-950/40 dark:to-red-900/40 ring-1 ring-rose-200 dark:ring-rose-800">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-rose-800 dark:text-rose-200">
              <span className="flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                {t.absenceRate}
              </span>
              <span className="text-3xl font-bold tabular-nums">
                {absencePct}%
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ProgressBar value={stats.absence_pct} color="bg-rose-500" />
            <p className="text-xs text-rose-700 dark:text-rose-300">
              {t.unexcusedAbsences(stats.absent_count, stats.empty_count)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detail cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium uppercase tracking-wide">
              <Users className="h-3.5 w-3.5" />
              {t.statsStudents}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.unique_students}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {stats.total_records} {t.statsRecords}
            </p>
          </CardContent>
        </Card>

        <Card size="sm" className="ring-1 ring-emerald-200 dark:ring-emerald-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 text-xs font-medium uppercase tracking-wide">
              <CheckCircle className="h-3.5 w-3.5" />
              {t.statusPresent}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              {stats.present_count}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{t.statsPtEach1}</p>
          </CardContent>
        </Card>

        <Card size="sm" className="ring-1 ring-amber-200 dark:ring-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 text-xs font-medium uppercase tracking-wide">
              <Clock className="h-3.5 w-3.5" />
              {t.statusLate}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
              {stats.late_count}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{t.statsPtEach05}</p>
          </CardContent>
        </Card>

        <Card size="sm" className="ring-1 ring-rose-200 dark:ring-rose-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 text-xs font-medium uppercase tracking-wide">
              <XCircle className="h-3.5 w-3.5" />
              {t.statusAbsent}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">
              {stats.absent_count}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{t.statsPt0}</p>
          </CardContent>
        </Card>

        <Card size="sm" className="ring-1 ring-blue-200 dark:ring-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 text-xs font-medium uppercase tracking-wide">
              <BookOpen className="h-3.5 w-3.5" />
              {t.statusExcused}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {stats.excused_count}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{t.statsPtEach1}</p>
          </CardContent>
        </Card>
      </div>

      {/* Points legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground px-1">
        <span className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3 text-emerald-500" />
          {t.attendanceFormula}
        </span>
        <span className="flex items-center gap-1 gap-x-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
          P=1pt
          <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
          L=0.5pt
          <span className="inline-block w-2 h-2 rounded-full bg-rose-500" />
          U=0pt
          <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
          E=1pt
        </span>
      </div>
    </div>
  );
}
