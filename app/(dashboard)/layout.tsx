import { redirect } from 'next/navigation';

import { SidebarContent } from '@/components/dashboard/sidebar-content';
import { Topbar } from '@/components/dashboard/topbar';
import { auth } from '@/lib/auth';
import { getPlan } from '@/lib/server/plans';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const plan = await getPlan(session.user.id);
  const user = {
    name: session.user.name ?? null,
    email: session.user.email ?? null,
    plan,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed sidebar — desktop only */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-surface-2 lg:block">
        <SidebarContent user={user} />
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-64">
        <Topbar user={user} />
        <main className="flex-1">
          <div className="container py-6 sm:py-8 lg:py-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
