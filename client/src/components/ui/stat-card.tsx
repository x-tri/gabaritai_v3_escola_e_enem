import * as React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  iconClassName?: string;
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  (
    {
      title,
      value,
      subtitle,
      icon: Icon,
      trend,
      trendValue,
      iconClassName,
      className,
      ...props
    },
    ref
  ) => {
    const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
    const trendColor =
      trend === 'up'
        ? 'text-emerald-600 dark:text-emerald-400'
        : trend === 'down'
        ? 'text-red-600 dark:text-red-400'
        : 'text-slate-500 dark:text-slate-400';

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl border border-slate-200 dark:border-slate-800',
          'bg-white dark:bg-slate-900',
          'shadow-sm hover:shadow-md transition-shadow',
          'p-6',
          className
        )}
        {...props}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {title}
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {value}
            </p>
            {(subtitle || (trend && trendValue)) && (
              <div className="flex items-center gap-2">
                {trend && trendValue && (
                  <span className={cn('flex items-center gap-1 text-sm font-medium', trendColor)}>
                    <TrendIcon className="h-4 w-4" />
                    {trendValue}
                  </span>
                )}
                {subtitle && (
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {subtitle}
                  </span>
                )}
              </div>
            )}
          </div>
          {Icon && (
            <div
              className={cn(
                'h-12 w-12 rounded-lg flex items-center justify-center',
                'bg-primary/10 text-primary',
                iconClassName
              )}
            >
              <Icon className="h-6 w-6" />
            </div>
          )}
        </div>
      </div>
    );
  }
);

StatCard.displayName = 'StatCard';

export { StatCard };
