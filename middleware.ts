import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Never block these paths
  if (
    pathname === '/update-time' ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/login')
  ) {
    return NextResponse.next();
  }

  try {
    // Use a lightweight internal API route to check maintenance state.
    // Prisma cannot run on the Edge runtime, so we delegate to a Node.js API route.
    const checkUrl = new URL('/api/maintenance-status', request.url);
    const res = await fetch(checkUrl, {
      headers: { 'x-internal': '1' },
    });

    if (res.ok) {
      const { isUpdating } = await res.json();
      if (isUpdating) {
        return NextResponse.redirect(new URL('/update-time', request.url));
      }
    }
  } catch (error) {
    // If check fails, let the request through — don't block the whole site
    console.error('Middleware status check error:', error);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};