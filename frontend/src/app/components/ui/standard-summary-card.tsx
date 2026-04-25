'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StandardSummaryCardProps {
  title: string;
  value: string | number | undefined;
  icon: React.ReactNode;
  unit?: string;
  trend?: {
    value: string;
    isUp?: boolean;
  };
  variant?: 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'muted' | 'slate' | 'primary' | 'emerald' | 'indigo';
  isAlert?: boolean;
  className?: string;
  isPremium?: boolean; // New prop for Hub-style premium look
}

export function StandardSummaryCard({
  title,
  value,
  icon,
  unit,
  trend,
  variant = 'blue',
  isAlert = false,
  className,
  isPremium = true // Default to premium look for modernization
}: StandardSummaryCardProps) {
  
  const variantStyles: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 shadow-blue-500/10",
    green: "bg-green-50 text-green-600 dark:bg-green-900/20 shadow-green-500/10",
    red: "bg-red-50 text-red-600 dark:bg-red-900/20 shadow-red-500/10",
    orange: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 shadow-orange-500/10",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 shadow-purple-500/10",
    muted: "bg-muted/50 text-muted-foreground shadow-inner",
    slate: "bg-slate-900 text-white border-slate-800 shadow-slate-900/20 dark:bg-card dark:text-foreground dark:border-border",
    primary: "bg-white text-primary border-primary/20 shadow-primary/5 dark:bg-card dark:text-primary dark:border-border",
    emerald: "bg-emerald-600 text-white border-emerald-700 shadow-emerald-600/20",
    indigo: "bg-indigo-600 text-white border-indigo-700 shadow-indigo-600/20"
  };

  const iconBgMap: Record<string, string> = {
    slate: "bg-white/10 text-white",
    primary: "bg-primary/10 text-primary",
    emerald: "bg-white/10 text-white",
    indigo: "bg-white/10 text-white",
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    red: "bg-red-100 text-red-600",
    orange: "bg-orange-100 text-orange-600",
    purple: "bg-purple-100 text-purple-600",
    muted: "bg-background text-muted-foreground"
  };

  if (!isPremium) {
    // Legacy / Minimalist fallback
    return (
      <div className={cn(
        "p-6 rounded-xl border shadow-sm bg-card transition-all hover:shadow-md flex flex-col justify-between",
        isAlert && value && Number(value) > 0 ? "border-red-200 bg-red-50/30 animate-pulse" : "",
        className
      )}>
        <div className="flex justify-between items-start mb-4">
          <div className={cn("p-3 rounded-xl", variantStyles[variant])}>
            {icon}
          </div>
          {trend && (
            <span className={cn(
              "text-[10px] font-black px-2 py-1 rounded",
              trend.isUp ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
            )}>
              {trend.value}
            </span>
          )}
        </div>
        <div>
          <h4 className="text-2xl font-black text-foreground">
            {typeof value === 'number' ? value.toLocaleString() : (value || '0')}
            {unit ? <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span> : null}
          </h4>
          <p className="text-[10px] font-black text-muted-foreground tracking-tight mt-1 uppercase">
            {title}
          </p>
        </div>
      </div>
    );
  }

  // Premium Hub-style variant
  return (
    <div className={cn(
      "p-8 rounded-xl border transition-all hover:scale-[1.05] group overflow-hidden relative shadow-lg",
      variantStyles[variant],
      className
    )}>
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center group-hover:rotate-6 transition-transform shadow-lg", 
          iconBgMap[variant] || "bg-white/20 text-current"
        )}>
          {icon}
        </div>
        {trend && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-[10px] font-black tracking-widest uppercase backdrop-blur-md border border-white/10">
             {trend.value}
          </div>
        )}
      </div>
      <div className="relative z-10 ">
        <p className="hub-subtitle-label opacity-60 mb-2">{title}</p>
        <h4 className="text-3xl font-black tracking-tighter tabular-nums">
          {typeof value === 'number' ? value.toLocaleString() : (value || '0')}
          {unit && <span className="text-sm font-bold opacity-60 ml-2">{unit}</span>}
        </h4>
      </div>
      
      {/* Background Icon Watermark */}
      <div className="absolute right-[-10%] bottom-[-10%] opacity-[0.05] group-hover:rotate-12 group-hover:scale-110 transition-all duration-700 text-foreground">
        {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 120 }) : null}
      </div>
    </div>
  );
}
