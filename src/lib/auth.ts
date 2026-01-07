import { auth } from '@/server/auth/config';
import { NextResponse } from 'next/server';

/**
 * Gets the authorized emails from environment variable
 * @returns Array of authorized email addresses
 */
export const getAuthorizedEmails = (): string[] => {
  const emails = process.env.AUTHORIZED_EMAILS;
  if (!emails) {
    return [];
  }
  return emails.split(',').map(email => email.trim().toLowerCase());
};

/**
 * Checks if an email is in the authorized list
 * @param email - Email address to check
 * @returns True if email is authorized, false otherwise
 */
export const isAuthorizedEmail = (email: string | null | undefined): boolean => {
  if (!email) {
    return false;
  }
  const authorizedEmails = getAuthorizedEmails();
  return authorizedEmails.includes(email.toLowerCase());
};

/**
 * Gets the current server session
 * @returns Session object or null if not authenticated
 */
export const getServerSession = async () => {
  return await auth();
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

