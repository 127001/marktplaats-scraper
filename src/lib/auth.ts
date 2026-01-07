import { auth } from '@/server/auth/config';
import { NextResponse } from 'next/server';
import { isAuthorizedEmail } from '@/lib/authorization';
import { headers } from 'next/headers';

// Re-export for backward compatibility
export { isAuthorizedEmail, getAuthorizedEmails } from '@/lib/authorization';

/**
 * Gets the current server session
 * @returns Session object or null if not authenticated
 */
export const getServerSession = async () => {
  return await auth();
};

/**
 * Verifies Vercel cron job authentication
 * Checks for x-vercel-cron header or CRON_SECRET header
 * @returns True if authenticated as a cron job, false otherwise
 */
export const verifyCronAuth = async (): Promise<boolean> => {
  const headersList = await headers();
  
  // Check for Vercel's automatic cron header
  const vercelCron = headersList.get('x-vercel-cron');
  if (vercelCron === '1') {
    return true;
  }
  
  // Check for custom CRON_SECRET header (optional, for additional security)
  const cronSecret = headersList.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;
  
  if (expectedSecret && cronSecret === `Bearer ${expectedSecret}`) {
    return true;
  }
  
  return false;
};

/**
 * Requires authentication for API routes
 * Returns NextResponse with error if not authenticated
 * @returns Session object or null if not authenticated
 */
export const requireAuth = async () => {
  const session = await getServerSession();
  
  if (!session?.user?.email) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ),
      session: null
    };
  }

  if (!isAuthorizedEmail(session.user.email)) {
    return {
      error: NextResponse.json(
        { error: 'Forbidden: Email not authorized' },
        { status: 403 }
      ),
      session: null
    };
  }

  return {
    error: null,
    session
  };
};

/**
 * Requires either user authentication or cron authentication
 * Useful for endpoints that can be called by both users and cron jobs
 * @returns Object with error (if any) and session (if user auth)
 */
export const requireAuthOrCron = async () => {
  // First check if it's a cron job
  const isCron = await verifyCronAuth();
  if (isCron) {
    return {
      error: null,
      session: null,
      isCron: true
    };
  }
  
  // Otherwise, require user authentication
  const authResult = await requireAuth();
  return {
    ...authResult,
    isCron: false
  };
};

