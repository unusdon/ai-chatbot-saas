import { Bot, CreditCard, LayoutDashboard } from 'lucide-react';
import type { ComponentType } from 'react';

export type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  match: (pathname: string) => boolean;
};

export const NAV_PRIMARY: NavItem[] = [
  {
    label: 'Overview',
    href: '/dashboard',
    icon: LayoutDashboard,
    match: (p) => p === '/dashboard',
  },
  {
    label: 'Chatbots',
    href: '/bots',
    icon: Bot,
    match: (p) => p.startsWith('/bots'),
  },
];

export const NAV_ACCOUNT: NavItem[] = [
  {
    label: 'Usage & billing',
    href: '/account/usage',
    icon: CreditCard,
    match: (p) => p.startsWith('/account/usage'),
  },
];
