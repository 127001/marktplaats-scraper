import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/server/auth/config';
import { isAuthorizedEmail } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow access to auth routes, signin page, access-denied page, and public assets
  // This must be checked FIRST before any auth calls
  if (
    pathname.startsWith('/api/auth') ||
    pathname === '/signin' ||
    pathname === '/access-denied' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/file.svg') ||
    pathname.startsWith('/globe.svg') ||
    pathname.startsWith('/next.svg') ||
    pathname.startsWith('/vercel.svg') ||
    pathname.startsWith('/window.svg')
  ) {
    return NextResponse.next();
  }

  try {
    // Check authentication
    // In NextAuth v5, auth() in middleware automatically reads from request context
    const session = await auth();

    // If not authenticated, redirect to sign in
    if (!session) {
      const signInUrl = new URL('/signin', request.url);
      if (pathname !== '/') {
        signInUrl.searchParams.set('callbackUrl', pathname);
      }
      return NextResponse.redirect(signInUrl);
    }

    // Check if email is authorized
    if (!session.user?.email || !isAuthorizedEmail(session.user.email)) {
      // Only redirect if not already on access-denied page
      if (pathname !== '/access-denied') {
        return NextResponse.redirect(new URL('/access-denied', request.url));
      }
    }

    return NextResponse.next();
  } catch (error) {
    // If auth fails, log and allow request (NextAuth will handle authentication)
    console.error('Middleware auth error:', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (authentication routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};

