/**
 * Edge middleware: protect /dashboard/** and redirect signed-in users away
 * from /login + /signup. Uses the JWT session strategy + the Edge-safe
 * `authConfig` so no Node-only modules (Postgres, bcrypt) get pulled into
 * the middleware bundle.
 */
import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';

import { authConfig } from '@/lib/auth.config';

const { auth } = NextAuth(authConfig);

const PROTECTED = ['/dashboard'];
const AUTH_PAGES = ['/login', '/signup', '/forgot-password'];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthed = Boolean(req.auth?.user);

  if (PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    if (!isAuthed) {
      const url = new URL('/login', req.nextUrl);
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }
  }

  if (AUTH_PAGES.includes(pathname) && isAuthed) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
