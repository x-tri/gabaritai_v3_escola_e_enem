import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { NavItem } from './NavItem';
import { LucideIcon } from 'lucide-react';

interface NavItemConfig {
  id: string;
  label: string;
  icon?: LucideIcon;
}

interface MobileNavDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: NavItemConfig[];
  activeItem: string;
  onItemClick: (id: string) => void;
  title?: string;
}

export function MobileNavDrawer({
  open,
  onOpenChange,
  items,
  activeItem,
  onItemClick,
  title = 'Menu',
}: MobileNavDrawerProps) {
  const handleItemClick = (id: string) => {
    onItemClick(id);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">G</span>
            </div>
            <span className="font-bold text-xl">GabaritAI</span>
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1">
          {items.map((item) => (
            <NavItem
              key={item.id}
              label={item.label}
              icon={item.icon}
              isActive={activeItem === item.id}
              onClick={() => handleItemClick(item.id)}
              className="w-full justify-start"
            />
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
