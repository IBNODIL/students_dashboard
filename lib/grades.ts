import type { Course } from "@/lib/types";

/**
 * Parsed numeric assignment score, or null for placeholders like "-", empty, non-numeric.
 * Mirrors the validated logic used on the student profile page so that grade
 * percentages are consistent everywhere in the app.
 */
export function parseScoredEarned(raw: string | number): number | null {
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : null;
  }
  const s = String(raw).trim();
  if (s === "" || s === "-" || s.toLowerCase() === "null") return null;
  const normalized = s.replace(",", ".");
  if (!/^-?\d*\.?\d+$/.test(normalized)) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Sum of valid (numeric, scored) assignment points for a single course. */
export function sumScoredAssignments(course: Course): {
  earned: number;
  max: number;
} {
  let earned = 0;
  let max = 0;
  const list = course.echo_grades?.assignments;
  if (!list) return { earned: 0, max: 0 };
  for (const a of list) {
    const e = parseScoredEarned(a.current_grade);
    if (e === null) continue;
    const m = Number(a.full_grade);
    if (!Number.isFinite(m) || m <= 0) continue;
    earned += e;
    max += m;
  }
  return { earned, max };
}

/** Single course grade %, weighted by actual scored points (or null if nothing scored yet). */
export function courseLmsPercent(course: Course): number | null {
  const { earned, max } = sumScoredAssignments(course);
  if (max <= 0) return null;
  return (earned / max) * 100;
}

/**
 * Overall grade % across multiple courses, pooling earned/max points
 * (point-weighted) rather than averaging each course's percentage equally.
 * Returns null if there are no scored assignments at all.
 */
export function overallLmsPercentFromCourses(courses: Course[]): number | null {
  let earned = 0;
  let max = 0;
  for (const c of courses) {
    const s = sumScoredAssignments(c);
    earned += s.earned;
    max += s.max;
  }
  if (max <= 0) return null;
  return (earned / max) * 100;
}