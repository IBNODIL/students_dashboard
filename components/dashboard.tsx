"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { StatsCards } from "@/components/stats-cards";
import { FiltersForm } from "@/components/filters-form";
import { StudentPanels } from "@/components/student-panels";
import type { GroupedApiResponse, FilterValues, AttendanceStats, FilterOptions } from "@/lib/types";

const EMPTY_STATS: AttendanceStats = {
  total_records: 0,
  present_count: 0,
  late_count: 0,
  absent_count: 0,
  excused_count: 0,
  empty_count: 0,
  valid_records: 0,
  total_points: 0,
  max_points: 0,
  attendance_pct: 0,
  absence_pct: 0,
  unique_students: 0,
};

const EMPTY_FILTER_OPTIONS: FilterOptions = {
  nameOptions: [],
  studentIdOptions: [],
  groupOptions: [],
  subjectOptions: [],
  teacherOptions: [],
  teacherIdOptions: [],
  roomOptions: [],
};

const DEFAULT_FILTERS: FilterValues = {
  name: "",
  group: "",
  studentId: "",
  subject: "",
  teacher: "",
  teacherId: "",
  room: "",
  lessonTime: "",
  attendanceOperator: "",
  attendancePercent: "",
  gradeOperator: "",
  gradePercent: "",
  status: "all",
};

function buildQueryString(filters: FilterValues, page: number, limit = 20) {
  const params = new URLSearchParams();
  if (filters.name) params.set("name", filters.name);
  if (filters.group) params.set("group", filters.group);
  if (filters.studentId) params.set("studentId", filters.studentId);
  if (filters.subject) params.set("subject", filters.subject);
  if (filters.teacher) params.set("teacher", filters.teacher);
  if (filters.teacherId) params.set("teacherId", filters.teacherId);
  if (filters.room) params.set("room", filters.room);
  if (filters.lessonTime) params.set("lessonTime", filters.lessonTime);
  if (filters.attendanceOperator)
    params.set("attendanceOperator", filters.attendanceOperator);
  if (filters.attendancePercent)
    params.set("attendancePercent", filters.attendancePercent);
  if (filters.gradeOperator)
    params.set("gradeOperator", filters.gradeOperator);
  if (filters.gradePercent)
    params.set("gradePercent", filters.gradePercent);
  if (filters.status && filters.status !== "all")
    params.set("status", filters.status);
  params.set("page", String(page));
  params.set("limit", String(limit));
  return params.toString();
}

export function Dashboard({ onReady }: { onReady?: () => void }) {
  const [data, setData] = useState<GroupedApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [filterResetKey, setFilterResetKey] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FilterValues>(DEFAULT_FILTERS);
  const abortRef = useRef<AbortController | null>(null);

  // Separate state for all filter options (fetched once at a high limit
  // so autocomplete always shows the full list, not just the current page)
  const [allFilterOptions, setAllFilterOptions] = useState<FilterOptions>(EMPTY_FILTER_OPTIONS);

  // Fetch all filter options once on mount using a high limit
  useEffect(() => {
    fetch(`/api/students/grouped?page=1&limit=9999`)
      .then((r) => r.json())
      .then((json: GroupedApiResponse) => {
        if (json.filterOptions) {
          setAllFilterOptions(json.filterOptions);
        }
      })
      .catch(() => {/* ignore — fallback to per-page options */});
  }, []);

  const fetchData = useCallback(async (f: FilterValues, p: number) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    try {
      const qs = buildQueryString(f, p);
      const res = await fetch(`/api/students/grouped?${qs}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const json: GroupedApiResponse = await res.json();
      setData(json);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Fetch error:", err);
      }
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
      onReady?.();
    }
  }, [onReady]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchData(DEFAULT_FILTERS, 1);
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const handleFilterChange = useCallback(
    (values: FilterValues) => {
      // Close filter popovers and expanded student details before loading.
      setFilterResetKey((key) => key + 1);
      setFilters(values);
      setPage(1);
      fetchData(values, 1);
    },
    [fetchData]
  );

  const handlePageChange = useCallback(
    (p: number) => {
      setFilterResetKey((key) => key + 1);
      setPage(p);
      fetchData(filters, p);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [filters, fetchData]
  );

  const stats = data?.stats ?? EMPTY_STATS;
  const students = data?.students ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 1;

  const attendanceSummary = data?.studentStatusSummary ?? {
    present: 0,
    absent: 0,
    exit: 0,
    total: 0,
  };

  const showOverlay = isLoading && !isInitialLoad;

  return (
    <div className="relative space-y-6">

      {/* ── Full-screen loading overlay (filter/search/page change) ────────── */}
      {showOverlay && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/70 backdrop-blur-sm"
          aria-label="Loading results"
        >
          <div className="relative h-16 w-16">
            <svg
              className="h-16 w-16 animate-spin"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="4"
                className="text-muted-foreground/20"
              />
              <path
                d="M60 32a28 28 0 0 0-28-28"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                className="text-primary"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            Searching…
          </p>
        </div>
      )}

      {/* Stats overview */}
      <StatsCards stats={stats} />

      {/* Filters — use allFilterOptions so autocomplete shows every option */}
      <FiltersForm
        onFilterChange={handleFilterChange}
        isLoading={isLoading}
        closeDropdownsSignal={filterResetKey}
        nameOptions={allFilterOptions.nameOptions}
        studentIdOptions={allFilterOptions.studentIdOptions}
        groupOptions={allFilterOptions.groupOptions}
        subjectOptions={allFilterOptions.subjectOptions}
        teacherOptions={allFilterOptions.teacherOptions}
        teacherIdOptions={allFilterOptions.teacherIdOptions}
        roomOptions={allFilterOptions.roomOptions}
        presentCount={attendanceSummary.present}
        absentCount={attendanceSummary.absent}
        exitCount={attendanceSummary.exit}
        totalCount={attendanceSummary.total}
      />

      {/* Student expansion panels */}
      <StudentPanels
        students={students}
        total={total}
        page={page}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        isLoading={isLoading}
      />
    </div>
  );
}
