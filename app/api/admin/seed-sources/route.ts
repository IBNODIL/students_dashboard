import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/permission";
import { getPrisma } from "@/lib/prisma";

const VALID_TYPES = [
  "ATTENDANCE",
  "GRADES",
  "CREDITS",
  "LIVE_STATUS",
] as const;

type SeedSourceType = (typeof VALID_TYPES)[number];

function isValidType(value: unknown): value is SeedSourceType {
  return (
    typeof value === "string" &&
    VALID_TYPES.includes(value as SeedSourceType)
  );
}

// GET /api/admin/seed-sources
export async function GET() {
  try {
    await requireAdmin();

    const sources = await getPrisma().seedSource.findMany({
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json(sources);
  } catch (error) {
    console.error("GET /api/admin/seed-sources:", error);

    return NextResponse.json(
      { error: "Unauthorized or failed to fetch seed sources" },
      { status: 401 }
    );
  }
}

// POST /api/admin/seed-sources
export async function POST(request: Request) {
  try {
    await requireAdmin();

    const body = await request.json();

    const { name, url, type, active = true } = body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof url !== "string" ||
      !url.trim() ||
      !isValidType(type)
    ) {
      return NextResponse.json(
        {
          error: "name, url and a valid type are required",
        },
        { status: 400 }
      );
    }

    const source = await getPrisma().seedSource.create({
      data: {
        name: name.trim(),
        url: url.trim(),
        type,
        active: Boolean(active),
      },
    });

    return NextResponse.json(source, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/seed-sources:", error);

    return NextResponse.json(
      { error: "Failed to create seed source" },
      { status: 500 }
    );
  }
}