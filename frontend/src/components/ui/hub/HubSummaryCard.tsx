import React from 'react';
import { motion, Variants } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type HubSummaryColor = 'blue' | 'orange' | 'purple' | 'emerald' | 'rose' | 'amber';

export interface HubSummaryCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: number;
  color?: HubSummaryColor;
  className?: string;
  e2eLabel?: string;
}

const colorMap: Record<HubSummaryColor, string> = {
  blue: "bg-hub-blue/5 dark:bg-hub-blue/10 text-hub-blue dark:text-hub-blue-foreground border-hub-blue/20 shadow-xl shadow-hub-blue/5",
  orange: "bg-white dark:bg-white/5 text-slate-900 dark:text-white border-primary/20 shadow-xl shadow-primary/5",
  purple: "bg-white dark:bg-white/5 text-slate-900 dark:text-white border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none",
  emerald: "bg-hub-emerald/5 dark:bg-hub-emerald/10 text-hub-emerald dark:text-hub-emerald-foreground border-hub-emerald/20 shadow-xl shadow-hub-emerald/5",
  rose: "bg-hub-rose/5 dark:bg-hub-rose/10 text-hub-rose dark:text-hub-rose-foreground border-hub-rose/20 shadow-xl shadow-hub-rose/5",
  amber: "bg-hub-amber/5 dark:bg-hub-amber/10 text-hub-amber dark:text-hub-amber-foreground border-hub-amber/20 shadow-xl shadow-hub-amber/5"
};

const iconBgMap: Record<HubSummaryColor, string> = {
  blue: "bg-hub-blue/10 text-hub-blue dark:text-hub-blue-foreground",
  orange: "bg-primary/20 text-primary",
  purple: "bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white",
  emerald: "bg-hub-emerald/10 text-hub-emerald dark:text-hub-emerald-foreground",
  rose: "bg-hub-rose/10 text-hub-rose",
  amber: "bg-hub-amber/10 text-hub-amber"
};

const cardVariants: Variants = {
  hidden: { scale: 0.9, opacity: 0 },
  visible: { 
    scale: 1, 
    opacity: 1,
    transition: { type: "spring", stiffness: 100 }
  }
};

export function HubSummaryCard({ 
  title, 
  value, 
  description, 
  icon, 
  trend, 
  color = 'blue',
  className,
  e2eLabel
}: HubSummaryCardProps) {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -8, transition: { duration: 0.2 } }}
      className={cn(
        "p-10 rounded-xl transition-all duration-500 flex flex-col justify-between h-[320px] relative overflow-hidden group hub-glass-2",
        colorMap[color],
        className
      )}
    >
      <div className="flex justify-between items-start relative z-10">
        <div className={cn("p-5 rounded-[0.1rem] transition-transform duration-500 group-hover:rotate-12", iconBgMap[color])}>
          {icon}
        </div>
        {trend !== undefined && trend !== 0 && (
          <div className={cn(
            "flex items-center gap-1 text-[11px] font-black px-4 py-1.5 rounded-full backdrop-blur-md border tabular-nums",
            trend > 0 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" : "bg-red-500/10 border-red-500/20 text-red-600"
          )}>
            {trend > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>

      <div className="space-y-2 relative z-10">
        <p className="text-[11px] font-black tracking-[0.3em] opacity-80 mb-2 uppercase flex items-center gap-2">
          {title}
          {e2eLabel && <span className="e2e-label sr-only">{e2eLabel}</span>}
        </p>
        <h4 className="text-3xl font-black tracking-tighter leading-none tabular-nums">{value}</h4>
        {description && (
          <div className="pt-6">
            <div className="text-[11px] opacity-80 font-bold leading-relaxed max-w-[180px]">
              {description}
            </div>
          </div>
        )}
      </div>

      <div className="absolute -bottom-6 -left-6 opacity-[0.03] group-hover:opacity-[0.08] group-hover:rotate-12 transition-all duration-700 pointer-events-none">
        {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 140 }) : null}
      </div>
    </motion.div>
  );
}
