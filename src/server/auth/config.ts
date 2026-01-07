import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { isAuthorizedEmail } from '@/lib/auth';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) {
        return false;
      }

      // Check if email is in the authorized list
      if (!isAuthorizedEmail(user.email)) {
        console.log(`Unauthorized login attempt: ${user.email}`);
        return false;
      }

      return true;
    },
    async redirect({ url, baseUrl }) {
      // Handle redirects after sign in
      // If url is relative (starts with /), make it absolute
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      // If url is absolute and on the same origin, allow it
      try {
        const urlObj = new URL(url);
        if (urlObj.origin === baseUrl) {
          return url;
        }
      } catch {
        // Invalid URL, fall through to default
      }
      // Default: redirect to home (baseUrl)
      return baseUrl;
    },
    async jwt({ token, user }) {
      if (user) {
        // Store user data in token on first sign-in
        // Use email as ID if user.id doesn't exist (common with OAuth providers)
        if (user.id) {
          token.id = user.id as string;
        } else if (user.email) {
          token.id = user.email as string;
        }
        if (user.email) {
          token.email = user.email as string;
        }
        if (user.name) {
          token.name = user.name as string;
        }
        if (user.image) {
          token.picture = user.image as string;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // Add token data to session, preserving existing values
        if (token.id) {
          session.user.id = token.id as string;
        }
        if (token.email) {
          session.user.email = token.email as string;
        }
        if (token.name) {
          session.user.name = token.name as string;
        }
        if (token.picture) {
          session.user.image = token.picture as string;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/signin',
    error: '/access-denied',
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: process.env.AUTH_TRUST_HOST === 'true',
});

