import { ReactNode } from 'react';
import { TopNavbar, NavItemConfig } from './TopNavbar';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
  navItems: NavItemConfig[];
  activeNavItem: string;
  onNavItemClick: (id: string) => void;
  className?: string;
}

export function DashboardLayout({
  children,
  navItems,
  activeNavItem,
  onNavItemClick,
  className,
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <TopNavbar
        items={navItems}
        activeItem={activeNavItem}
        onItemClick={onNavItemClick}
      />
      <main className={cn('mx-auto max-w-7xl px-4 lg:px-8 py-6', className)}>
        {children}
      </main>
    </div>
  );
}
