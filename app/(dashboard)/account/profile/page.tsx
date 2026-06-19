import { eq } from 'drizzle-orm';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/db';
import { users } from '@/db/schema';
import { requireAuth } from '@/lib/server/require-auth';
import { listSecurityEvents } from '@/lib/server/sessions';

import { DeleteAccountCard } from './delete-account-card';
import { EmailForm } from './email-form';
import { PasswordForm } from './password-form';
import { ProfileForm } from './profile-form';
import { SecurityEventsCard } from './security-events-card';

export const metadata = { title: 'Profile' };
export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const user = await requireAuth();
  const row = await db.query.users.findFirst({ where: eq(users.id, user.id) });
  const events = await listSecurityEvents(user.id, 25);

  return (
    <div className="space-y-8">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Profile</h1>
        <p className="text-sm text-muted-foreground">Your identity, password, and account controls.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Display name</CardTitle>
          <CardDescription>Shown in the sidebar and on the embed widget header.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm defaultName={row?.name ?? ''} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email</CardTitle>
          <CardDescription>
            Used to sign in. Requires your current password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmailForm defaultEmail={row?.email ?? ''} hasPassword={Boolean(row?.hashedPassword)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            Changing your password signs out all other devices. This session stays alive.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm hasPassword={Boolean(row?.hashedPassword)} />
        </CardContent>
      </Card>

      <SecurityEventsCard events={events} />

      <DeleteAccountCard hasPassword={Boolean(row?.hashedPassword)} />
    </div>
  );
}
