import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/server/auth/config';
import { isAuthorizedEmail } from '@/lib/authorization';

/**
 * Verifies Vercel cron job authentication in proxy context
 * Checks for x-vercel-cron header or CRON_SECRET header
 * @param request - The NextRequest object with headers
 * @returns True if authenticated as a cron job, false otherwise
 */
const verifyCronAuth = (request: NextRequest): boolean => {
  // Check for Vercel's automatic cron header
  const vercelCron = request.headers.get('x-vercel-cron');
  if (vercelCron === '1') {
    return true;
  }
  
  // Check for custom CRON_SECRET header (optional, for additional security)
  const cronSecret = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;
  
  if (expectedSecret && cronSecret === `Bearer ${expectedSecret}`) {
    return true;
  }
  
  return false;
};

export async function proxy(request: NextRequest) {
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

  // Check for cron authentication on routes that support it
  // This must be checked BEFORE user authentication to allow cron jobs through
  if (pathname === '/api/update-listings') {
    if (verifyCronAuth(request)) {
      return NextResponse.next();
    }
    // If cron auth fails, fall through to user authentication check
  }

  try {
    // Check authentication
    // In NextAuth v5, auth() in proxy automatically reads from request context
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
    // If auth fails, log and redirect to sign in for security
    // Never allow requests through when authentication fails
    console.error('Proxy auth error:', error);
    const signInUrl = new URL('/signin', request.url);
    if (pathname !== '/') {
      signInUrl.searchParams.set('callbackUrl', pathname);
    }
    return NextResponse.redirect(signInUrl);
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
