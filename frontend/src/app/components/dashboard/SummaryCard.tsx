import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

const colorMap: Record<string, string> = {
  blue: "bg-blue-50 text-blue-600 border-blue-100",
  orange: "bg-orange-50 text-orange-600 border-orange-100",
  purple: "bg-purple-50 text-purple-600 border-purple-100",
  emerald: "bg-emerald-50 text-emerald-600 border-emerald-100"
};

interface SummaryCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  trend: number;
  color: string;
}

const SummaryCard = React.memo(({ title, value, description, icon, trend, color }: SummaryCardProps) => {
  return (
    <div className="p-8 rounded-[2.5rem] border-2 border-primary/5 bg-card shadow-lg hover:shadow-2xl hover:shadow-primary/5 transition-all group overflow-hidden relative">
      <div className="flex justify-between items-start mb-8">
        <div className={cn("p-4 rounded-2xl transition-all group-hover:scale-110 shadow-inner", colorMap[color])}>{icon}</div>
        {trend !== 0 && (
          <div className={cn("flex items-center gap-1 text-[10px] font-black px-3 py-1 rounded-full shadow-sm", trend > 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
            {trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div className="relative z-10 space-y-1">
        <h4 className="text-4xl font-black text-foreground tracking-tighter leading-none">{value}</h4>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pt-2">{title}</p>
        <div className="text-[11px] text-muted-foreground/40 mt-6 flex items-center gap-2 font-bold italic">
          <div className="w-1.5 h-1.5 bg-primary/20 rounded-full" />
          {description}
        </div>
      </div>
    </div>
  );
});

SummaryCard.displayName = 'SummaryCard';

export { SummaryCard };
