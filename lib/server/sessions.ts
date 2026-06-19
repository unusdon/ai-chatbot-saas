/**
 * Session data layer.
 *
 * One row per signed-in browser. The JWT carries a `sid` claim that maps to a
 * row here. Revoking is just setting `revokedAt`; the auth `session()`
 * callback returns null when revoked, which forces the next request to
 * redirect to /login.
 *
 * Sessions are also where we hang security audit-log writes — every sign-in,
 * sign-out, and explicit revocation flows through here.
 */
import { and, desc, eq, isNull, ne, sql } from 'drizzle-orm';

import { db } from '@/db';
import { securityEvents, userSessions, type UserSession } from '@/db/schema';

type RequestContext = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

const SESSION_HALF_LIFE_SECONDS = 5 * 60; // refresh lastSeenAt at most every 5 min

export async function createUserSession(
  userId: string,
  ctx: RequestContext = {},
): Promise<UserSession> {
  const [row] = await db
    .insert(userSessions)
    .values({
      userId,
      ipAddress: ctx.ipAddress?.slice(0, 64) ?? null,
      userAgent: ctx.userAgent?.slice(0, 1024) ?? null,
    })
    .returning();
  await recordSecurityEvent(userId, 'sign_in', ctx);
  return row;
}

/**
 * Look up a session by id. Returns null if it doesn't exist OR has been
 * revoked. Used by the auth() session callback to gate every authenticated
 * request.
 */
export async function getActiveSession(sessionId: string): Promise<UserSession | null> {
  const row = await db.query.userSessions.findFirst({
    where: and(eq(userSessions.id, sessionId), isNull(userSessions.revokedAt)),
  });
  return row ?? null;
}

/**
 * Bump lastSeenAt — but throttle to once per SESSION_HALF_LIFE_SECONDS so we
 * don't write on every request.
 */
export async function touchSession(sessionId: string): Promise<void> {
  await db
    .update(userSessions)
    .set({ lastSeenAt: new Date() })
    .where(
      and(
        eq(userSessions.id, sessionId),
        isNull(userSessions.revokedAt),
        sql`${userSessions.lastSeenAt} < NOW() - INTERVAL '${sql.raw(String(SESSION_HALF_LIFE_SECONDS))} seconds'`,
      ),
    );
}

export async function listSessionsForUser(userId: string): Promise<UserSession[]> {
  return db
    .select()
    .from(userSessions)
    .where(and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt)))
    .orderBy(desc(userSessions.lastSeenAt));
}

export async function revokeSession(
  userId: string,
  sessionId: string,
  ctx: RequestContext = {},
): Promise<boolean> {
  const [row] = await db
    .update(userSessions)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(userSessions.id, sessionId),
        eq(userSessions.userId, userId),
        isNull(userSessions.revokedAt),
      ),
    )
    .returning({ id: userSessions.id });
  if (row) {
    await recordSecurityEvent(userId, 'session_revoked', ctx, { sessionId });
  }
  return Boolean(row);
}

export async function revokeAllSessionsExcept(
  userId: string,
  exceptSessionId: string | null,
  ctx: RequestContext = {},
): Promise<number> {
  const where = exceptSessionId
    ? and(
        eq(userSessions.userId, userId),
        isNull(userSessions.revokedAt),
        ne(userSessions.id, exceptSessionId),
      )
    : and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt));
  const rows = await db
    .update(userSessions)
    .set({ revokedAt: new Date() })
    .where(where)
    .returning({ id: userSessions.id });
  if (rows.length > 0) {
    await recordSecurityEvent(userId, 'sessions_revoked_all', ctx, { count: rows.length });
  }
  return rows.length;
}

export async function recordSecurityEvent(
  userId: string,
  type:
    | 'sign_in'
    | 'sign_out'
    | 'session_revoked'
    | 'sessions_revoked_all'
    | 'password_changed'
    | 'email_changed'
    | 'profile_changed'
    | 'account_deleted',
  ctx: RequestContext = {},
  metadata?: Record<string, unknown>,
): Promise<void> {
  await db.insert(securityEvents).values({
    userId,
    type,
    ipAddress: ctx.ipAddress?.slice(0, 64) ?? null,
    userAgent: ctx.userAgent?.slice(0, 1024) ?? null,
    metadata: metadata ?? null,
  });
}

export async function listSecurityEvents(userId: string, limit = 50) {
  return db
    .select()
    .from(securityEvents)
    .where(eq(securityEvents.userId, userId))
    .orderBy(desc(securityEvents.createdAt))
    .limit(limit);
}
