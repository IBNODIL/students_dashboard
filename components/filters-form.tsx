"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import type { FilterValues } from "@/lib/types";
import { useLanguage } from "@/contexts/language-context";

const filterSchema = z
  .object({
    name: z.string(),
    group: z.string(),
    studentId: z.string(),
    subject: z.string(),
    teacher: z.string(),
    teacherId: z.string(),
    room: z.string(),
    lessonTime: z.string(),
    attendanceOperator: z.string(),
    attendancePercent: z.string(),
    gradeOperator: z.string(),
    gradePercent: z.string(),
    status: z.string(),
  })
  .superRefine((data, ctx) => {
    const validatePercent = (
      value: string,
      operator: string,
      field: "attendancePercent" | "gradePercent"
    ) => {
      if (operator && !value) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: "Enter percentage",
        });
        return;
      }

      if (
        value &&
        (Number(value) < 0 ||
          Number(value) > 100 ||
          Number.isNaN(Number(value)))
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: "Value must be 0-100",
        });
      }
    };

    validatePercent(
      data.attendancePercent,
      data.attendanceOperator,
      "attendancePercent"
    );

    validatePercent(
      data.gradePercent,
      data.gradeOperator,
      "gradePercent"
    );
  });

const defaultValues: FilterValues = {
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

interface FiltersFormProps {
  onFilterChange: (values: FilterValues) => void;
  isLoading?: boolean;
  nameOptions?: string[];
  studentIdOptions?: string[];
  groupOptions?: string[];
  subjectOptions?: string[];
  teacherOptions?: string[];
  teacherIdOptions?: string[];
  roomOptions?: string[];
  presentCount?: number;
  absentCount?: number;
  exitCount?: number;
  totalCount?: number;
}

export function FiltersForm({
  onFilterChange,
  isLoading,
  nameOptions = [],
  studentIdOptions = [],
  groupOptions = [],
  subjectOptions = [],
  teacherOptions = [],
  teacherIdOptions = [],
  roomOptions = [],
  presentCount = 0,
  absentCount = 0,
  exitCount = 0,
  totalCount = 0,
}: FiltersFormProps) {
  const { t } = useLanguage();
  const [submittedFilters, setSubmittedFilters] = useState<FilterValues>(defaultValues);
  const {
    control,
    register,
    watch,
    setValue,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<FilterValues>({
    resolver: zodResolver(filterSchema),
    defaultValues,
  });

  const renderComboboxField = (
    name: keyof FilterValues,
    id: string,
    label: string,
    placeholder: string,
    options: string[]
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Combobox items={options.slice(0, 10)} value={field.value} onValueChange={field.onChange}>
            <ComboboxInput
              id={id}
              placeholder={placeholder}
              className="h-8 text-sm"
              {...field}
              disabled={isLoading}
            />
            <ComboboxContent>
              <ComboboxEmpty>No items found.</ComboboxEmpty>
              <ComboboxList>
                {(item: string) => (
                  <ComboboxItem key={item} value={item}>
                    {item}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        )}
      />
    </div>
  );

  const renderPercentFilter = (
    label: string,
    operatorField: "attendanceOperator" | "gradeOperator",
    percentField: "attendancePercent" | "gradePercent"
  ) => (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">
        {label}
      </Label>

      <div className="flex gap-2">
        <Select
          value={watch(operatorField) || "none"}
          onValueChange={(v) =>
            setValue(operatorField, v === "none" ? "" : v)
          }
        >
          <SelectTrigger className="w-28 h-8">
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="none">Any</SelectItem>
            <SelectItem value="gt">Kottaroq</SelectItem>
            <SelectItem value="lt">Kichikroq</SelectItem>
          </SelectContent>
        </Select>

        <InputGroup className="flex-1 h-8">
          <InputGroupInput
            type="number"
            min={0}
            max={100}
            placeholder="0-100"
            {...register(percentField)}
            onInput={(e) => {
              const input = e.currentTarget;
              const value = Number(input.value);

              if (value > 100) input.value = "100";
              if (value < 0) input.value = "0";
            }}
          />
          <InputGroupAddon align="inline-end">
            %
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  );

  // Qidiruv tugmasi bosilganda yoki Enter bosilganda ishlaydi
  const onSubmit = (values: FilterValues) => {
    console.log("FILTER SUBMITTED", values);

    setSubmittedFilters(values);
    onFilterChange(values);
  };

  const handleReset = () => {
    reset(defaultValues);
    setSubmittedFilters(defaultValues);
    onFilterChange(defaultValues);
  };

  const statusValue = watch("status");
  const lessonTimeValue = watch("lessonTime");
  const hasActiveFilters = Object.entries(submittedFilters).some(([k, v]) =>
    k === "status" ? v !== "all" : v !== ""
  );

  return (
    // Grid elementlari form ichiga olindi, onSubmit hodisasi biriktirildi
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-xl border bg-card p-4 shadow-lg space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">{t.filtersTitle}</h2>
          {hasActiveFilters && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {t.filtersActive}
            </span>
          )}
        </div>
        <div className="flex align-center">
          <Button
            type="submit"
            size="sm"
            className="h-8 px-4 gap-2 text-xs font-medium mr-2"
            disabled={isLoading}
          >
            <Search className="h-3.5 w-3.5" />
            {t.searchButton || "Qidirish"}
          </Button>

          {hasActiveFilters && (
            <Button
              type="button" // Reset tugmasi formani yuborib yubormasligi uchun type="button" qilindi
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-7 gap-1 text-xs bg-rose-500 text-white"
            >
              <X className="h-3 w-3" />
              {t.filtersReset}
            </Button>
          )}
        </div>
      </div>

      {hasActiveFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <div className="rounded-xl border border-border bg-muted/50 px-3 py-2">
            <div className="text-sm text-muted-foreground">Total students</div>
            <div className="mt-1 text-lg font-semibold text-foreground">{totalCount}</div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
            <div className="text-sm text-emerald-700">Present</div>
            <div className="mt-1 text-lg font-semibold text-emerald-900">{presentCount}</div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
            <div className="text-sm text-amber-700">Exit</div>
            <div className="mt-1 text-lg font-semibold text-amber-900">{exitCount}</div>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
            <div className="text-sm text-rose-700">Absent</div>
            <div className="mt-1 text-lg font-semibold text-rose-900">{absentCount}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {renderComboboxField(
          "name",
          "name",
          t.labelFullName,
          t.placeholderName,
          nameOptions
        )}

        {renderComboboxField(
          "studentId",
          "studentId",
          t.labelStudentId,
          t.placeholderStudentId,
          studentIdOptions
        )}

        {renderComboboxField(
          "group",
          "group",
          t.labelGroup,
          t.placeholderGroup,
          groupOptions
        )}

        {renderComboboxField(
          "subject",
          "subject",
          t.labelSubject,
          t.placeholderSubject,
          subjectOptions
        )}

        {renderComboboxField(
          "teacher",
          "teacher",
          t.labelTeacher,
          t.placeholderTeacher,
          teacherOptions
        )}

        {renderComboboxField(
          "teacherId",
          "teacherId",
          t.labelTeacherId,
          t.placeholderTeacherId,
          teacherIdOptions
        )}

        {renderPercentFilter(
          "Attendance %",
          "attendanceOperator",
          "attendancePercent"
        )}

        {renderPercentFilter(
          "Grades %",
          "gradeOperator",
          "gradePercent"
        )}

        {renderComboboxField(
          "room",
          "room",
          t.labelRoom,
          "e.g. 302",
          roomOptions
        )}

        {/* Lesson Time */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t.labelLessonTime}</Label>
          <Select
            value={lessonTimeValue || "all"}
            onValueChange={(v) =>
              setValue("lessonTime", v === "all" ? "" : v)
            }
            disabled={isLoading}
          >
            <SelectTrigger className="h-8 text-sm w-full">
              <SelectValue placeholder={t.allTimes} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allTimes}</SelectItem>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {t.period(n)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t.labelStatus}</Label>
          <Select
            value={statusValue}
            onValueChange={(v) => setValue("status", v)}
            disabled={isLoading}
          >
            <SelectTrigger className="h-8 text-sm w-full">
              <SelectValue placeholder={t.allStatuses} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allStatuses}</SelectItem>
              <SelectItem value="present">{t.statusPresent}</SelectItem>
              <SelectItem value="exit">Exit</SelectItem>
              <SelectItem value="absent">{t.statusAbsent}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </form>
  );
}
