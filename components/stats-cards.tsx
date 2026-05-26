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

export function StatsCards({ stats }: StatsCardsProps) {
  const { t } = useLanguage();

  // Statusi bor barcha yozuvlar yig'indisini hisoblaymiz (bo'shlarini tashlab ketish uchun)
  const calculatedTotal =
    stats.present_count +
    stats.late_count +
    stats.absent_count +
    stats.excused_count;

  // Nolga bo'lish xatoligini oldini olamiz
  const divisor = calculatedTotal || 1;

  // Foizlarni faqat mavjud statuslar yig'indisiga nisbatan hisoblash (Shunda jami 100% chiqadi)
  const presentPct = ((stats.present_count / divisor) * 100).toFixed(1);
  const latePct = ((stats.late_count / divisor) * 100).toFixed(1);
  const absentPct = ((stats.absent_count / divisor) * 100).toFixed(1);
  const excusedPct = ((stats.excused_count / divisor) * 100).toFixed(1);

  return (
    <div className="space-y-4">
      {/* Detail cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {/* Total Students Card */}
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

        {/* Present Percentage Card */}
        <Card size="sm" className="ring-1 ring-emerald-200 dark:ring-emerald-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 text-xs font-medium uppercase tracking-wide">
              <CheckCircle className="h-3.5 w-3.5" />
              {t.statusPresent}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              {presentPct}%
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {stats.present_count} {t.statsRecords || "ta yozuv"}
            </p>
          </CardContent>
        </Card>

        {/* Late Percentage Card */}
        <Card size="sm" className="ring-1 ring-amber-200 dark:ring-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 text-xs font-medium uppercase tracking-wide">
              <Clock className="h-3.5 w-3.5" />
              {t.statusLate}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
              {latePct}%
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {stats.late_count} {t.statsRecords || "ta yozuv"}
            </p>
          </CardContent>
        </Card>

        {/* Absent Percentage Card */}
        <Card size="sm" className="ring-1 ring-rose-200 dark:ring-rose-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 text-xs font-medium uppercase tracking-wide">
              <XCircle className="h-3.5 w-3.5" />
              {t.statusAbsent}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">
              {absentPct}%
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {stats.absent_count} {t.statsRecords || "ta yozuv"}
            </p>
          </CardContent>
        </Card>

        {/* Excused Percentage Card */}
        <Card size="sm" className="ring-1 ring-blue-200 dark:ring-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 text-xs font-medium uppercase tracking-wide">
              <BookOpen className="h-3.5 w-3.5" />
              {t.statusExcused}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {excusedPct}%
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {stats.excused_count} {t.statsRecords || "ta yozuv"}
            </p>
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
