/**
 * Full Auth.js v5 configuration — Node runtime only.
 *
 * Imports the Edge-safe `authConfig` from `lib/auth.config.ts` and layers on
 * the Drizzle adapter + Credentials provider + the session-tracking + audit
 * callbacks that need DB access (and therefore the Node runtime).
 *
 * How session tracking is wired (we use JWT strategy, not DB sessions):
 *   - On sign-in, the `jwt()` callback creates a `user_session` row + a
 *     `sign_in` security event, and stashes `token.sid` = that row's id.
 *   - On every subsequent request, the `session()` callback looks up the
 *     `sid` in `user_session`. If the row was revoked (revokedAt is set),
 *     it returns null, which forces `requireAuth()` to redirect to /login.
 *   - `touchSession()` updates `lastSeenAt` at most once per 5 minutes.
 *
 * The headers() helper from next/headers is available in callbacks because
 * NextAuth's auth handler runs them inside a Next.js request context.
 */
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { headers } from 'next/headers';
import { z } from 'zod';

import { db } from '@/db';
import { accounts, sessions, users, verificationTokens } from '@/db/schema';
import { authConfig } from '@/lib/auth.config';
import {
  createUserSession,
  getActiveSession,
  recordSecurityEvent,
  touchSession,
} from '@/lib/server/sessions';

const CredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
    sid?: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    ...authConfig.providers,
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = CredentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await db.query.users.findFirst({
          where: eq(users.email, email.toLowerCase()),
        });
        if (!user?.hashedPassword) return null;

        const ok = await bcrypt.compare(password, user.hashedPassword);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Sign-in moment: `user` is populated. Mint a user_session and stash
      // its id as the `sid` claim. We cast to a permissive shape because
      // Auth.js v5 doesn't export a stable JWT augmentation point.
      if (user?.id) {
        token.sub = user.id;
        const ctx = await captureRequestContext();
        const created = await createUserSession(user.id, ctx);
        (token as Record<string, unknown>).sid = created.id;
      }
      return token;
    },

    async session({ session, token }) {
      if (!token.sub) return session;
      session.user.id = token.sub;

      const sid = (token as Record<string, unknown>).sid;
      if (typeof sid === 'string') {
        const active = await getActiveSession(sid);
        if (!active) {
          // Blanking the user id signals "logged out" — requireAuth() then
          // redirects to /login.
          return { ...session, user: { ...session.user, id: '' } };
        }
        session.sid = sid;
        // Fire-and-forget: don't block the response on the touch write.
        void touchSession(sid);
      }
      return session;
    },
  },
  events: {
    async signOut(message) {
      // Mark the user_session revoked + write a sign_out audit row. `message`
      // can be either `{ token }` (JWT) or `{ session }` (DB sessions).
      const token = 'token' in message ? message.token : null;
      const sid = token && typeof (token as Record<string, unknown>).sid === 'string'
        ? ((token as Record<string, unknown>).sid as string)
        : null;
      const sub = token?.sub;
      if (sid && typeof sub === 'string') {
        const ctx = await captureRequestContext().catch(() => ({}));
        await Promise.all([
          revokeBySid(sub, sid),
          recordSecurityEvent(sub, 'sign_out', ctx),
        ]).catch(() => {
          /* best-effort */
        });
      }
    },
  },
});

async function revokeBySid(userId: string, sid: string) {
  const { db } = await import('@/db');
  const { userSessions } = await import('@/db/schema');
  const { and, eq, isNull } = await import('drizzle-orm');
  await db
    .update(userSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(userSessions.id, sid), eq(userSessions.userId, userId), isNull(userSessions.revokedAt)));
}

async function captureRequestContext() {
  try {
    const h = await headers();
    const forwarded = h.get('x-forwarded-for');
    const ip =
      (forwarded ? forwarded.split(',')[0]?.trim() : null) ?? h.get('x-real-ip') ?? null;
    const ua = h.get('user-agent') ?? null;
    return { ipAddress: ip, userAgent: ua };
  } catch {
    // headers() throws outside a request context (e.g., webhook callbacks).
    return {};
  }
}
