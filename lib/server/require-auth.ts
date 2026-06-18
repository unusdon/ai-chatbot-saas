import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';

/**
 * Server-side guard. Use at the top of any Server Component, route handler,
 * or server action that requires an authenticated user. Returns the user with
 * a non-null id (the middleware already protects /dashboard/**, so unauth
 * users won't reach a Server Component covered by this guard — but server
 * actions can be invoked from anywhere, and they MUST self-check).
 */
export async function requireAuth(): Promise<{ id: string; name: string | null; email: string | null }> {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  return {
    id: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email ?? null,
  };
}
