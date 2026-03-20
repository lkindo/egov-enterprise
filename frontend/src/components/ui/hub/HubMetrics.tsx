'use client';

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
  trend?: string;
  className?: string;
}

export function HubMetricCard({ 
  title, 
  value, 
  icon: Icon, 
  color = 'primary', 
  status = 'NOMINAL', 
  trend,
  className 
}: HubMetricProps) {
  const colorMap = {
    primary: "text-primary bg-primary/5 border-primary/10 shadow-primary/5",
    emerald: "text-emerald-500 bg-emerald-500/5 border-emerald-500/10 shadow-emerald-500/5",
    rose: "text-rose-500 bg-rose-500/5 border-rose-500/10 shadow-rose-500/5",
    amber: "text-amber-500 bg-amber-500/5 border-amber-500/10 shadow-amber-500/5",
    indigo: "text-indigo-600 bg-indigo-600/5 border-indigo-100 shadow-indigo-600/5",
    slate: "text-slate-900 bg-slate-50 border-slate-100 shadow-slate-900/5",
  };

  const iconBgMap = {
    primary: "bg-primary text-white shadow-primary/20",
    emerald: "bg-emerald-500 text-white shadow-emerald-500/20",
    rose: "bg-rose-500 text-white shadow-rose-500/20",
    amber: "bg-amber-500 text-white shadow-amber-500/20",
    indigo: "bg-indigo-600 text-white shadow-indigo-600/20",
    slate: "bg-slate-900 text-white shadow-slate-900/20",
  };

  return (
    <div className={cn(
      "hub-table-container p-10 group hover:scale-[1.02] transition-all relative overflow-hidden bg-white border-border/50 shadow-md",
      className
    )}>
      <div className="flex justify-between items-start mb-10 relative z-10">
        <div className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl border border-border/10 group-hover:rotate-12 transition-transform", 
          iconBgMap[color]
        )}>
          <Icon size={24} />
        </div>
        <div className="flex flex-col items-end gap-2">
            <HubStatusBadge label={status} variant="default" className="text-[8px] font-black tracking-widest shadow-sm" />
            {trend && (
                <span className={cn(
                    "text-[9px] font-black px-2 py-0.5 rounded-full border tracking-tighter uppercase",
                    color === 'rose' ? "bg-rose-50 text-rose-500 border-rose-100" : "bg-emerald-50 text-emerald-500 border-emerald-100"
                )}>
                    {trend}
                </span>
            )}
        </div>
      </div>
      <div className="relative z-10">
        <h3 className="text-3xl font-black tracking-tighter text-foreground leading-none tabular-nums">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </h3>
        <p className="text-[10px] font-black text-muted-foreground/40 tracking-[0.4em] uppercase mt-4 leading-none flex items-center gap-3">
          <span className="w-6 h-0.5 bg-current opacity-20" />
          {title}
        </p>
      </div>
      <div className="absolute right-[-14%] bottom-[-14%] opacity-[0.02] group-hover:scale-125 group-hover:rotate-12 transition-all duration-1000 grayscale pointer-events-none">
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
