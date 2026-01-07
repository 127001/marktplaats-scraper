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

