import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    // Only allow sign in with your specific Google account
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        // Check if email matches the allowed email from environment variable
        const { email } = profile as { email?: string };
        const allowedEmail = process.env.ALLOWED_EMAIL;
        
        if (allowedEmail) {
          return email === allowedEmail;
        }
        
        // If no ALLOWED_EMAIL is set, allow all Google sign-ins
        return true;
      }
      return true;
    },
  },
  pages: {
    signIn: '/auth/signin',
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 