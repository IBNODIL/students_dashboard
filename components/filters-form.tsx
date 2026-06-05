"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
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

const filterSchema = z.object({
  name: z.string(),
  group: z.string(),
  studentId: z.string(),
  subject: z.string(),
  teacher: z.string(),
  teacherId: z.string(),
  date: z.string(),
  room: z.string(),
  lessonTime: z.string(),
  status: z.string(),
});

const defaultValues: FilterValues = {
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
}: FiltersFormProps) {
  const { t } = useLanguage();
  const { control, register, watch, setValue, reset, getValues, handleSubmit } =
    useForm<FilterValues>({
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
          <Combobox items={options} value={field.value} onValueChange={field.onChange}>
            <ComboboxInput
              id={id}
              placeholder={placeholder}
              className="h-8 text-sm"
              {...field}
              disabled={isLoading}
            />
            <ComboboxContent>
              <ComboboxEmpty>No items found.</ComboboxEmpty>
              <ComboboxList
                renderItem={(item) => (
                  <ComboboxItem key={item} value={item}>
                    {item}
                  </ComboboxItem>
                )}
              />
            </ComboboxContent>
          </Combobox>
        )}
      />
    </div>
  );

  // Qidiruv tugmasi bosilganda yoki Enter bosilganda ishlaydi
  const onSubmit = (values: FilterValues) => {
    onFilterChange(values);
  };

  const handleReset = () => {
    reset(defaultValues);
    onFilterChange(defaultValues);
  };

  const statusValue = watch("status");
  const lessonTimeValue = watch("lessonTime");
  const hasActiveFilters = Object.entries(getValues()).some(([k, v]) =>
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

        {/* Date */}
        <div className="space-y-1.5">
          <Label htmlFor="date" className="text-xs text-muted-foreground">
            {t.labelDate}
          </Label>
          <Input
            id="date"
            type="date"
            className="h-8 text-sm"
            {...register("date")}
            disabled={isLoading}
          />
        </div>

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
              <SelectItem value="P">P — {t.statusPresent} (1 pt)</SelectItem>
              <SelectItem value="L">L — {t.statusLate} (0.5 pt)</SelectItem>
              <SelectItem value="U">U — {t.statusAbsent} (0 pt)</SelectItem>
              <SelectItem value="E">E — {t.statusExcused} (1 pt)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </form>
  );
}
