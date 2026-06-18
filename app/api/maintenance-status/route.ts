import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

// Force Node.js runtime — Prisma cannot run on Edge
export const runtime = 'nodejs';

export async function GET() {
  try {
    const prisma = getPrisma();
    const state = await prisma.systemState.findUnique({
      where: { id: 'maintenance' },
      select: { isUpdating: true },
    });
    return NextResponse.json({ isUpdating: state?.isUpdating ?? false });
  } catch {
    // If DB is unreachable, report not-updating so the site stays accessible
    return NextResponse.json({ isUpdating: false });
  }
}