import React from 'react';
import { cn } from '@/lib/utils';
import { HubStatusBadge } from './HubStatusBadge';
import { LucideIcon } from 'lucide-react';

interface HubMetricProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: 'primary' | 'emerald' | 'rose' | 'amber' | 'indigo' | 'slate';
  status?: string;
  unit?: string;
  trend?: string;
  className?: string;
}

export function HubMetricCard({ 
  title, 
  value, 
  icon: Icon, 
  color = 'primary', 
  status = 'NOMINAL', 
  unit,
  trend,
  className 
}: HubMetricProps) {
  const colorMap = {
    primary: "text-primary bg-primary/5 border-primary/10 shadow-primary/5",
    emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 border-emerald-500/10 shadow-emerald-500/5",
    rose: "text-rose-600 dark:text-rose-400 bg-rose-500/5 border-rose-500/10 shadow-rose-500/5",
    amber: "text-amber-600 dark:text-amber-400 bg-amber-500/5 border-amber-500/10 shadow-amber-500/5",
    indigo: "text-hub-indigo bg-hub-indigo/5 border-hub-indigo/10 shadow-hub-indigo/5",
    slate: "text-foreground bg-muted border-border shadow-slate-900/5",
  };

  const iconBgMap = {
    primary: "bg-primary text-white shadow-primary/20",
    emerald: "bg-emerald-500 text-white shadow-emerald-500/20",
    rose: "bg-rose-50 text-white shadow-rose-500/20 dark:bg-rose-500",
    amber: "bg-amber-500 text-white shadow-amber-500/20",
    indigo: "bg-hub-indigo text-white shadow-hub-indigo/20",
    slate: "bg-primary/10 text-primary border border-primary/20 shadow-primary/5 dark:bg-primary/20 dark:text-primary",
  };

  return (
    <div className={cn(
      "hub-table-container p-8 group hover:scale-[1.02] transition-all relative overflow-hidden bg-card border-border/50 dark:border-border/40 shadow-md",
      className
    )}>
      <div className="flex justify-between items-start mb-8 relative z-10">
        <div className={cn(
          "w-12 h-12 rounded-lg flex items-center justify-center shadow-xl border border-border/10 group-hover:rotate-12 transition-transform", 
          iconBgMap[color]
        )}>
          <Icon size={22} />
        </div>
        <div className="flex flex-col items-end gap-2">
            <HubStatusBadge label={status} variant="default" className="text-[10px] font-bold tracking-widest shadow-sm" />
            {trend && (
                <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-lg border tracking-tighter uppercase",
                    color === 'rose' ? "bg-rose-50 text-rose-500 dark:bg-rose-950/40 dark:text-rose-400 border-rose-100 dark:border-rose-900/30" : "bg-emerald-50 text-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30"
                )}>
                    {trend}
                </span>
            )}
        </div>
      </div>
      <div className="relative z-10">
        <h3 className="text-3xl font-bold tracking-tighter text-foreground leading-none tabular-nums flex items-baseline gap-1.5">
          {typeof value === 'number' ? value.toLocaleString() : value}
          {unit && <span className="text-xs font-bold text-muted-foreground dark:text-muted-foreground tracking-tight uppercase">{unit}</span>}
        </h3>
        <p className="text-[10px] font-bold text-muted-foreground dark:text-muted-foreground tracking-[0.3em] uppercase mt-4 leading-none flex items-center gap-3">
          <span className="w-5 h-0.5 bg-current opacity-30" />
          {title}
        </p>
      </div>
      <div className="absolute right-[-14%] bottom-[-14%] opacity-[0.015] group-hover:scale-125 group-hover:rotate-12 transition-all duration-1000 grayscale pointer-events-none">
        <Icon size={180} />
      </div>
    </div>
  );
}

export function HubMetricGrid({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 px-2", className)}>
            {children}
        </div>
    );
}
