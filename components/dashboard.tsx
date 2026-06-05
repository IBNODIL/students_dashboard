"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { StatsCards } from "@/components/stats-cards";
import { FiltersForm } from "@/components/filters-form";
import { StudentPanels } from "@/components/student-panels";
import type { GroupedApiResponse, FilterValues, AttendanceStats } from "@/lib/types";

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

const DEFAULT_FILTERS: FilterValues = {
  name: "",
  group: "",
  studentId: "",
  subject: "",
  teacher: "",
  teacherId: "",
  date: "",
  room: "",
  lessonTime: "",
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
  if (filters.date) params.set("date", filters.date);
  if (filters.room) params.set("room", filters.room);
  if (filters.lessonTime) params.set("lessonTime", filters.lessonTime);
  if (filters.status && filters.status !== "all")
    params.set("status", filters.status);
  params.set("page", String(page));
  params.set("limit", String(limit));
  return params.toString();
}

export function Dashboard() {
  const [data, setData] = useState<GroupedApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FilterValues>(DEFAULT_FILTERS);
  const abortRef = useRef<AbortController | null>(null);

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
    }
  }, []);

  useEffect(() => {
    fetchData(DEFAULT_FILTERS, 1);
  }, [fetchData]);

  const handleFilterChange = useCallback(
    (values: FilterValues) => {
      setFilters(values);
      setPage(1);
      fetchData(values, 1);
    },
    [fetchData]
  );

  const handlePageChange = useCallback(
    (p: number) => {
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

  const {
    nameOptions,
    studentIdOptions,
    groupOptions,
    subjectOptions,
    teacherOptions,
    teacherIdOptions,
    roomOptions,
  } = useMemo(() => {
    const nameSet = new Set<string>();
    const studentIdSet = new Set<string>();
    const groupSet = new Set<string>();
    const subjectSet = new Set<string>();
    const teacherSet = new Set<string>();
    const teacherIdSet = new Set<string>();
    const roomSet = new Set<string>();

    students.forEach((student) => {
      nameSet.add(student.student_name);
      studentIdSet.add(String(student.student_id));
      if (student.group_name) groupSet.add(student.group_name);
      student.courses.forEach((course) => {
        if (course.subject_name) subjectSet.add(course.subject_name);
        if (course.teacher_name) teacherSet.add(course.teacher_name);
        if (course.teacher_id) teacherIdSet.add(course.teacher_id);
        course.attendances.forEach((attendance) => {
          if (attendance.lesson_room !== undefined && attendance.lesson_room !== null) {
            roomSet.add(String(attendance.lesson_room));
          }
        });
      });
    });

    return {
      nameOptions: Array.from(nameSet),
      studentIdOptions: Array.from(studentIdSet),
      groupOptions: Array.from(groupSet),
      subjectOptions: Array.from(subjectSet),
      teacherOptions: Array.from(teacherSet),
      teacherIdOptions: Array.from(teacherIdSet),
      roomOptions: Array.from(roomSet),
    };
  }, [students]);

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <StatsCards stats={stats} />

      {/* Filters */}
      <FiltersForm
        onFilterChange={handleFilterChange}
        isLoading={isLoading}
        nameOptions={nameOptions}
        studentIdOptions={studentIdOptions}
        groupOptions={groupOptions}
        subjectOptions={subjectOptions}
        teacherOptions={teacherOptions}
        teacherIdOptions={teacherIdOptions}
        roomOptions={roomOptions}
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

