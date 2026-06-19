import { MobileSidebar } from './mobile-sidebar';

export function Topbar({
  user,
  rightSlot,
}: {
  user: { name?: string | null; email?: string | null; plan?: string | null };
  rightSlot?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border/60 bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
      <MobileSidebar user={user} />
      <div className="ml-auto flex items-center gap-2">{rightSlot}</div>
    </header>
  );
}
