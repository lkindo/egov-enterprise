'use client';

import React from 'react';
import { motion, Variants } from 'framer-motion';
import { cn } from '@/lib/utils';
import { LucideIcon, Maximize2, Download, Filter } from 'lucide-react';
import { hubItemVariants } from '@/lib/hub-animations';

interface HubChartCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  color?: 'blue' | 'emerald' | 'purple' | 'orange';
}

export function HubChartCard({
  title,
  subtitle,
  icon,
  children,
  actions,
  className,
  color = 'blue'
}: HubChartCardProps) {
  
  const colorGradients = {
    blue: "from-hub-blue/10 via-transparent to-transparent",
    emerald: "from-hub-emerald/10 via-transparent to-transparent",
    purple: "from-hub-purple/10 via-transparent to-transparent",
    orange: "from-hub-orange/10 via-transparent to-transparent",
  };

  return (
    <motion.div
      variants={hubItemVariants}
      className={cn(
        "hub-card-premium p-10 md:p-14 group relative overflow-hidden",
        className
      )}
    >
      {/* Background Gradient Accent */}
      <div className={cn(
        "absolute top-0 right-0 w-[50%] h-full bg-gradient-to-l opacity-30 pointer-events-none transition-opacity group-hover:opacity-50",
        colorGradients[color]
      )} />

      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 relative z-10 gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            {icon && (
              <div className={cn(
                "w-14 h-11 rounded-[0.1rem] flex items-center justify-center shadow-xl border border-white/10",
                color === 'blue' ? "bg-hub-blue/10 text-hub-blue" :
                color === 'emerald' ? "bg-hub-emerald/10 text-hub-emerald" :
                color === 'purple' ? "bg-hub-purple/10 text-hub-purple" : "bg-hub-orange/10 text-hub-orange"
              )}>
                {icon}
              </div>
            )}
            <div>
              <h3 className="text-3xl font-bold tracking-tight text-foreground leading-none uppercase">
                {title}
              </h3>
              {subtitle && (
                <p className="hub-label-accent mt-3">{subtitle}</p>
              )}
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-3">
          {actions || (
            <>
              <button className="w-12 h-12 rounded-[0.1rem] bg-slate-100 dark:bg-white/5 flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all border border-transparent hover:border-primary/20">
                <Filter size={18} />
              </button>
              <button className="w-12 h-12 rounded-[0.1rem] bg-slate-100 dark:bg-white/5 flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all border border-transparent hover:border-primary/20">
                <Download size={18} />
              </button>
              <button className="w-12 h-12 rounded-[0.1rem] bg-slate-100 dark:bg-white/5 flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all border border-transparent hover:border-primary/20">
                <Maximize2 size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Chart Content Area */}
      <div className="relative z-10 w-full min-h-[300px]">
        {children}
      </div>

      {/* Decorative Elements */}
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-[60px] pointer-events-none" />
    </motion.div>
  );
}
