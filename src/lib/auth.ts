'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Sign in with Google
export const handleSignIn = () => signIn('google');

// Sign out
export const handleSignOut = () => signOut({ callbackUrl: '/' });

// Hook to protect admin-only routes
export function useRequireAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Do nothing while loading
    if (!session) router.push('/auth/signin'); // Redirect if not authenticated
  }, [session, status, router]);

  return { session, status };
}

// Hook to get session data for optional authentication features
export function useAuth() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const isLoading = status === 'loading';

  return {
    session,
    isAuthenticated,
    isLoading,
    signIn: handleSignIn,
    signOut: handleSignOut,
  };
} 