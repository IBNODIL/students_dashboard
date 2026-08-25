import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permission";

const prisma = getPrisma();

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

// GET /api/admin/seed-sources/:id
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin();

  const { id } = await params;

  const source = await prisma.seedSource.findUnique({
    where: { id },
  });

  if (!source) {
    return NextResponse.json(
      { error: "Seed source not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(source);
}

// PATCH /api/admin/seed-sources/:id
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin();

  const { id } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};

  if (body.name !== undefined) data.name = body.name;
  if (body.url !== undefined) data.url = body.url;
  if (body.active !== undefined) data.active = body.active;

  if (body.type !== undefined) {
    if (!isValidType(body.type)) {
      return NextResponse.json(
        { error: "Invalid type" },
        { status: 400 }
      );
    }

    data.type = body.type;
  }

  const source = await prisma.seedSource.update({
    where: { id },
    data,
  });

  return NextResponse.json(source);
}

// DELETE /api/admin/seed-sources/:id
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin();

  const { id } = await params;

  await prisma.seedSource.delete({
    where: { id },
  });

  return NextResponse.json({
    success: true,
  });
}