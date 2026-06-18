import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** Narrow Prisma's JsonValue down to string[], defaulting to [] for anything else. */
function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export async function GET() {
  try {
    const prisma = getPrisma();
    const state = await prisma.systemState.findUnique({
      where: { id: "maintenance" },
      select: { isUpdating: true, logs: true, errorMsg: true, startedAt: true },
    });

    return NextResponse.json({
      isUpdating: state?.isUpdating ?? false,
      logs: asStringArray(state?.logs),
      errorMsg: state?.errorMsg ?? null,
      startedAt: state?.startedAt ?? null,
    });
  } catch {
    return NextResponse.json({
      isUpdating: false,
      logs: [],
      errorMsg: "Could not reach database",
      startedAt: null,
    });
  }
}