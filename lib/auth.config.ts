/**
 * Edge-safe Auth.js configuration.
 *
 * This file MUST NOT import anything that depends on Node-only APIs
 * (Postgres driver, bcrypt, fs, etc.) because it is consumed by
 * `middleware.ts`, which runs on the Edge runtime.
 *
 * The Credentials `authorize` callback (which does need bcrypt + Postgres)
 * lives in `lib/auth.ts`, the Node-runtime config that extends this one.
 */
import Google from 'next-auth/providers/google';
import type { NextAuthConfig } from 'next-auth';

import { env } from '@/lib/env';

const providers: NextAuthConfig['providers'] = [];

if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
    }),
  );
}

export const authConfig = {
  session: { strategy: 'jwt' },
  secret: env.AUTH_SECRET,
  pages: { signIn: '/login' },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
} satisfies NextAuthConfig;
