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
}

const colorMap: Record<HubSummaryColor, string> = {
  blue: "bg-blue-600/5 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 shadow-xl shadow-blue-500/5",
  orange: "bg-slate-900 text-white border-slate-800 shadow-2xl shadow-slate-900/20",
  purple: "bg-white dark:bg-white/5 text-slate-900 dark:text-white border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none",
  emerald: "bg-emerald-600/5 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-xl shadow-emerald-500/5",
  rose: "bg-rose-600/5 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 shadow-xl shadow-rose-500/5",
  amber: "bg-amber-600/5 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 shadow-xl shadow-amber-500/5"
};

const iconBgMap: Record<HubSummaryColor, string> = {
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  orange: "bg-primary/20 text-primary",
  purple: "bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  rose: "bg-rose-500/10 text-rose-600",
  amber: "bg-amber-500/10 text-amber-600"
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
  className
}: HubSummaryCardProps) {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -8, transition: { duration: 0.2 } }}
      className={cn(
        "p-10 rounded-[3.5rem] border transition-all flex flex-col justify-between h-[320px] relative overflow-hidden group",
        colorMap[color],
        className
      )}
    >
      <div className="flex justify-between items-start relative z-10">
        <div className={cn("p-5 rounded-[1.5rem] transition-transform duration-500 group-hover:rotate-12", iconBgMap[color])}>
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
        <p className="text-[11px] font-black tracking-[0.3em] opacity-60 mb-2 uppercase">{title}</p>
        <h4 className="text-3xl font-black tracking-tighter leading-none tabular-nums">{value}</h4>
        {description && (
          <div className="pt-6">
            <div className="text-[11px] opacity-40 font-bold leading-relaxed max-w-[180px]">
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
