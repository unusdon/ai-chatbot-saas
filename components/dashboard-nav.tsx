import { LogOut, Sparkles } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { signOutAction } from '@/lib/auth-actions';

export function DashboardNav({ user }: { user: { name?: string | null; email?: string | null } }) {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <Sparkles className="h-5 w-5" />
            <span>AI Chatbot SaaS</span>
          </Link>
          <nav className="hidden items-center gap-4 text-sm sm:flex">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
              Overview
            </Link>
            <Link href="/bots" className="text-muted-foreground hover:text-foreground">
              Chatbots
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {user.name ?? user.email}
          </span>
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm">
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
