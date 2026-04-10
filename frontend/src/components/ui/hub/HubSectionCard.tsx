import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HubSectionCardProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  children?: React.ReactNode;
  statusBadges?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function HubSectionCard({
  title,
  description,
  icon: Icon,
  children,
  statusBadges,
  action,
  className
}: HubSectionCardProps) {
  return (
    <div className={cn("hub-card-section", className)}>
      <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
        <div className="w-24 h-24 bg-white/10 dark:bg-primary/5 rounded-[0.1rem] flex items-center justify-center p-6 backdrop-blur-3xl border border-white/20">
          <Icon size={48} className="text-primary-foreground dark:text-primary" />
        </div>
        <div className="space-y-3 flex-1 text-center md:text-left">
          <h2 className="text-[length:var(--font-size-hub-title)] font-[number:var(--font-weight-hub-title)] tracking-[var(--letter-spacing-hub)]">
            {title}
          </h2>
          {statusBadges && (
            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              {statusBadges}
            </div>
          )}
          {description && (
            <p className="text-slate-600 font-medium leading-relaxed max-w-xl">
              {description}
            </p>
          )}
        </div>
        {action && (
          <div className="relative z-10">
            {action}
          </div>
        )}
      </div>
      <div className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] bg-primary/20 blur-[120px] rounded-full" />
      
      {children && (
        <div className="mt-10 relative z-10">
          {children}
        </div>
      )}
    </div>
  );
}
