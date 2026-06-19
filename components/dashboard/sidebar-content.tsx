'use client';

import { LogOut, Sparkles } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { signOutAction } from '@/lib/auth-actions';

import { NAV_ACCOUNT, NAV_PRIMARY } from './nav-items';
import { SidebarNav, SidebarSectionTitle } from './sidebar-nav';

export function SidebarContent({
  user,
  onNavigate,
}: {
  user: { name?: string | null; email?: string | null; plan?: string | null };
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pt-5">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <span className="text-sm">AI Chatbot SaaS</span>
        </Link>
      </div>

      <nav className="mt-6 flex-1 space-y-6 overflow-y-auto px-3">
        <div>
          <SidebarSectionTitle>Workspace</SidebarSectionTitle>
          <SidebarNav items={NAV_PRIMARY} onNavigate={onNavigate} />
        </div>
        <div>
          <SidebarSectionTitle>Account</SidebarSectionTitle>
          <SidebarNav items={NAV_ACCOUNT} onNavigate={onNavigate} />
        </div>
      </nav>

      <div className="border-t p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <Avatar name={user.name ?? user.email ?? '?'} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name ?? 'Account'}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          {user.plan ? (
            <span className="rounded-full border bg-card px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {user.plan}
            </span>
          ) : null}
        </div>
        <form action={signOutAction} className="mt-1">
          <Button type="submit" variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
      {initials || '?'}
    </span>
  );
}
