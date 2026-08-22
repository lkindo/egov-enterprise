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

  // rose 는 라이트에서 파스텔 틴트 배경 위 흰 아이콘(실측 1.10:1)으로 오류 지표가 보이지 않던 결함이라
  // 양 프로필에서 4.5:1 이상이 검증된 semantic pair 로 치환한다. indigo/slate 는 측정된 실패가 없어 유지.
  const iconBgMap = {
    primary: "bg-primary text-primary-foreground shadow-primary/20",
    emerald: "bg-success text-success-foreground shadow-success/20",
    rose: "bg-destructive text-destructive-foreground shadow-destructive/20",
    amber: "bg-warning text-warning-foreground shadow-warning/20",
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
                    color === 'rose' ? "bg-destructive/10 text-destructive-emphasis border-destructive/20" : "bg-success/10 text-success-emphasis border-success/20"
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
