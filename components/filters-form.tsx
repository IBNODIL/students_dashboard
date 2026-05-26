"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
}

export function FiltersForm({ onFilterChange, isLoading }: FiltersFormProps) {
  const { t } = useLanguage();
  const { register, watch, setValue, reset, getValues, handleSubmit } =
    useForm<FilterValues>({
      resolver: zodResolver(filterSchema),
      defaultValues,
    });

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
        {/* Full Name */}
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs text-muted-foreground">
            {t.labelFullName}
          </Label>
          <Input
            id="name"
            placeholder={t.placeholderName}
            className="h-8 text-sm"
            {...register("name")}
            disabled={isLoading}
          />
        </div>

        {/* Student ID */}
        <div className="space-y-1.5">
          <Label htmlFor="studentId" className="text-xs text-muted-foreground">
            {t.labelStudentId}
          </Label>
          <Input
            id="studentId"
            placeholder={t.placeholderStudentId}
            className="h-8 text-sm"
            {...register("studentId")}
            disabled={isLoading}
          />
        </div>

        {/* Group */}
        <div className="space-y-1.5">
          <Label htmlFor="group" className="text-xs text-muted-foreground">
            {t.labelGroup}
          </Label>
          <Input
            id="group"
            placeholder={t.placeholderGroup}
            className="h-8 text-sm"
            {...register("group")}
            disabled={isLoading}
          />
        </div>

        {/* Subject */}
        <div className="space-y-1.5">
          <Label htmlFor="subject" className="text-xs text-muted-foreground">
            {t.labelSubject}
          </Label>
          <Input
            id="subject"
            placeholder={t.placeholderSubject}
            className="h-8 text-sm"
            {...register("subject")}
            disabled={isLoading}
          />
        </div>

        {/* Teacher Name */}
        <div className="space-y-1.5">
          <Label htmlFor="teacher" className="text-xs text-muted-foreground">
            {t.labelTeacher}
          </Label>
          <Input
            id="teacher"
            placeholder={t.placeholderTeacher}
            className="h-8 text-sm"
            {...register("teacher")}
            disabled={isLoading}
          />
        </div>

        {/* Teacher ID */}
        <div className="space-y-1.5">
          <Label htmlFor="teacherId" className="text-xs text-muted-foreground">
            {t.labelTeacherId}
          </Label>
          <Input
            id="teacherId"
            placeholder={t.placeholderTeacherId}
            className="h-8 text-sm"
            {...register("teacherId")}
            disabled={isLoading}
          />
        </div>

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

        {/* Lesson Room */}
        <div className="space-y-1.5">
          <Label htmlFor="room" className="text-xs text-muted-foreground">
            {t.labelRoom}
          </Label>
          <Input
            id="room"
            placeholder="e.g. 302"
            className="h-8 text-sm"
            {...register("room")}
            disabled={isLoading}
          />
        </div>

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
