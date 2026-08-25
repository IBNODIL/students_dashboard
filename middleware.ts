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

  // Check maintenance mode
  try {
    const checkUrl = new URL('/api/maintenance-status', request.url);

    const res = await fetch(checkUrl, {
      headers: {
        'x-internal': '1',
      },
      cache: 'no-store',
    });

    if (res.ok) {
      const { isUpdating } = await res.json();

      if (isUpdating) {
        return NextResponse.redirect(
          new URL('/update-time', request.url)
        );
      }
    }
  } catch (error) {
    // Important:
    // If the internal maintenance check fails (for example through ngrok),
    // do not crash the request. Allow the user to continue.
    console.error('Middleware maintenance check failed:', error);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};