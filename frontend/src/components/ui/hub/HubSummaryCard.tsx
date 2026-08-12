import React from 'react';
import { motion, Variants } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type HubSummaryColor = 'blue' | 'orange' | 'purple' | 'emerald' | 'rose' | 'amber';

export interface HubSummaryCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactElement<{ size?: number }>;
  trend?: number;
  color?: HubSummaryColor;
  className?: string;
  e2eLabel?: string;
}

const colorMap: Record<HubSummaryColor, string> = {
  blue: "bg-hub-blue/5 dark:bg-hub-blue/10 text-hub-blue border-hub-blue/20 shadow-xl shadow-hub-blue/5",
  orange: "bg-card dark:bg-white/5 text-foreground dark:text-orange-400 border-primary/20 dark:border-orange-500/30 shadow-xl shadow-primary/5",
  purple: "bg-card dark:bg-white/5 text-foreground dark:text-hub-purple border-border dark:border-hub-purple/30 shadow-xl dark:shadow-none",
  emerald: "bg-hub-emerald/5 dark:bg-hub-emerald/10 text-hub-emerald dark:text-emerald-400 border-hub-emerald/20 dark:border-emerald-500/30 shadow-xl shadow-hub-emerald/5",
  rose: "bg-hub-rose/5 dark:bg-hub-rose/10 text-hub-rose dark:text-rose-400 border-hub-rose/20 dark:border-rose-500/30 shadow-xl shadow-hub-rose/5",
  amber: "bg-hub-amber/5 dark:bg-hub-amber/10 text-hub-amber dark:text-amber-400 border-hub-amber/20 dark:border-amber-500/30 shadow-xl shadow-hub-amber/5"
};

const iconBgMap: Record<HubSummaryColor, string> = {
  blue: "bg-hub-blue/10 text-hub-blue",
  orange: "bg-primary/20 text-primary dark:bg-orange-950/40 dark:text-orange-400",
  purple: "bg-muted dark:bg-hub-purple/40 text-foreground dark:text-hub-purple",
  emerald: "bg-hub-emerald/10 text-hub-emerald dark:bg-emerald-950/40 dark:text-emerald-400",
  rose: "bg-hub-rose/10 text-hub-rose dark:bg-rose-950/40 dark:text-rose-400",
  amber: "bg-hub-amber/10 text-hub-amber dark:bg-amber-950/40 dark:text-amber-400"
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
        "p-8 rounded-lg transition-all duration-500 flex flex-col justify-between min-h-[280px] h-auto relative overflow-hidden group hub-glass-2 border",
        colorMap[color],
        className
      )}
    >
      <div className="flex justify-between items-start relative z-10">
        <div className={cn("p-4 rounded-lg transition-transform duration-500 group-hover:rotate-12", iconBgMap[color])}>
          {icon}
        </div>
        {trend !== undefined && trend !== 0 && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-lg backdrop-blur-md border tabular-nums",
            trend > 0
              ? "bg-success/10 border-success/20 text-success-emphasis"
              : "bg-destructive/10 border-destructive/20 text-destructive-emphasis"
          )}>
            {trend > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>

      <div className="space-y-3 relative z-10 mt-6">
        <p className="text-[10px] font-bold tracking-[0.25em] opacity-70 mb-1 uppercase flex items-center gap-2">
          {title}
          {e2eLabel && <span className="e2e-label sr-only">{e2eLabel}</span>}
        </p>
        <h4 className="text-3xl font-bold tracking-tighter leading-none tabular-nums text-foreground">{value}</h4>
        {description && (
          <div className="pt-4 border-t border-border/10 dark:border-white/5">
            <p className="text-xs opacity-75 font-semibold leading-relaxed max-w-[240px] text-muted-foreground">
              {description}
            </p>
          </div>
        )}
      </div>

      <div className="absolute -bottom-6 -left-6 opacity-[0.02] group-hover:opacity-[0.06] group-hover:rotate-12 transition-all duration-700 pointer-events-none">
        {React.cloneElement(icon, { size: 140 })}
      </div>
    </motion.div>
  );
}
