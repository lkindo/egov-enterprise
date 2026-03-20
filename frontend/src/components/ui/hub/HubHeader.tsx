import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HubHeaderProps {
  title: string;
  highlight?: string;
  subtitle?: string;
  icon: React.ReactNode | LucideIcon | any;
  className?: string;
  actions?: React.ReactNode;
}

export function HubHeader({ 
  title, 
  highlight, 
  subtitle, 
  icon, 
  className,
  actions
}: HubHeaderProps) {
  const renderIcon = () => {
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === 'function') {
      const Icon = icon as any;
      return <Icon size={32} />;
    }
    return null;
  };

  return (
    <div className={cn("flex flex-col md:flex-row items-start md:items-center justify-between px-6 gap-8 mb-12 animate-in fade-in slide-in-from-top-8 duration-700", className)}>
      <div className="flex items-center gap-6">
        <div className="hub-icon-box shadow-xl shadow-primary/20 hover:scale-110 transition-transform">
          <div className="text-white dark:text-slate-900">
            {renderIcon()}
          </div>
        </div>
        <div className="space-y-1">
          <h2 className="hub-title-main flex items-center gap-3">
             <span className="opacity-40 uppercase text-xs tracking-[0.4em] font-black mr-2">EGOV</span>
             {title} {highlight && <span className="text-primary">{highlight}</span>} HUB
          </h2>
          {subtitle && (
            <p className="hub-subtitle-label mt-2 uppercase tracking-widest opacity-50">
               {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-3 bg-muted/30 p-2 rounded-2xl border border-border/50 shadow-inner">
          {actions}
        </div>
      )}
    </div>
  );
}
