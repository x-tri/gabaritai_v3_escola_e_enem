import { useState } from 'react';
import { useTheme } from 'next-themes';
import { Menu, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProfileMenu } from '@/components/ProfileMenu';
import { NavItem } from './NavItem';
import { MobileNavDrawer } from './MobileNavDrawer';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export interface NavItemConfig {
  id: string;
  label: string;
  icon?: LucideIcon;
}

interface TopNavbarProps {
  items: NavItemConfig[];
  activeItem: string;
  onItemClick: (id: string) => void;
  className?: string;
}

export function TopNavbar({ items, activeItem, onItemClick, className }: TopNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800',
          'bg-white/95 dark:bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/60',
          className
        )}
      >
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo & Mobile Menu */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Abrir menu</span>
              </Button>
              <div className="flex items-center gap-2">
                <img src="/favicon.png" alt="XTRI" className="h-8 w-8 object-contain" />
                <span className="font-bold text-xl text-slate-900 dark:text-slate-100 hidden sm:block">
                  XTRI
                </span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {items.map((item) => (
                <NavItem
                  key={item.id}
                  label={item.label}
                  icon={item.icon}
                  isActive={activeItem === item.id}
                  onClick={() => onItemClick(item.id)}
                />
              ))}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="text-slate-600 dark:text-slate-400"
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
                <span className="sr-only">Alternar tema</span>
              </Button>
              <ProfileMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <MobileNavDrawer
        open={mobileMenuOpen}
        onOpenChange={setMobileMenuOpen}
        items={items}
        activeItem={activeItem}
        onItemClick={onItemClick}
      />
    </>
  );
}
