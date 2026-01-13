import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface NavItemProps {
  label: string;
  icon?: LucideIcon;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

export function NavItem({ label, icon: Icon, isActive, onClick, className }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
        'hover:bg-slate-100 dark:hover:bg-slate-800',
        isActive
          ? 'text-primary bg-primary/10 dark:bg-primary/20'
          : 'text-slate-600 dark:text-slate-400',
        className
      )}
    >
      {Icon && <Icon className="h-4 w-4" />}
      <span>{label}</span>
    </button>
  );
}
