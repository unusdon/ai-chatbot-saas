import { redirect } from 'next/navigation';

import { DashboardNav } from '@/components/dashboard-nav';
import { auth } from '@/lib/auth';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardNav user={{ name: session.user.name, email: session.user.email }} />
      <main className="flex-1 px-6 py-8">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
