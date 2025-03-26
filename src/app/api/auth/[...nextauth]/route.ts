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
        // You can restrict to a specific email or domain by uncommenting and modifying below:
        // * To restrict by specific email:
        const { email } = profile as { email?: string };
        return email === "jarno.de.wit@gmail.com";
        
        // * To restrict by domain:
        // const { email } = profile as { email?: string };
        // return email?.endsWith("@yourdomain.com") || false;
        
        return true; // Allow all Google sign-ins for now
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