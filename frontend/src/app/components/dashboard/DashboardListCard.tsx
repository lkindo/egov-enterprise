import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const textColors: Record<string, string> = {
  blue: "group-hover:text-blue-600",
  emerald: "group-hover:text-emerald-600"
};

interface DashboardItem {
  nttSj: string;
  frstRegisterPnttmStr?: string;
  [key: string]: any;
}

interface DashboardListCardProps {
  title: string;
  items: DashboardItem[];
  icon: React.ReactNode;
  moreHref?: string;
  color: string;
}

const DashboardListCard = React.memo(({ title, items, icon, moreHref, color }: DashboardListCardProps) => {
  return (
    <div className="border-2 border-primary/5 rounded-[3rem] bg-card shadow-xl overflow-hidden flex flex-col h-[420px] group transition-all duration-500">
      <div className="px-10 py-8 border-b border-primary/5 flex items-center justify-between bg-muted/5">
        <h3 className="font-black text-xl flex items-center gap-3">{icon}{title}</h3>
        <Link href={moreHref || '#'} className="p-3 bg-muted/50 rounded-2xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all" aria-label={`${title} 더보기`}>
          <ArrowRight size={18} />
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-3">
          {items?.slice(0, 6).map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-5 hover:bg-muted/30 rounded-[1.75rem] transition-all cursor-pointer group/item border border-transparent hover:border-primary/5">
              <div className="flex items-center gap-4 overflow-hidden">
                <div className="w-2 h-2 rounded-full bg-muted shrink-0 group-hover/item:bg-primary" />
                <span className={cn("text-sm font-bold text-foreground truncate", textColors[color])}>{item.nttSj}</span>
              </div>
              <span className="text-[10px] text-muted-foreground/50 ml-4 shrink-0 font-black bg-muted/50 px-3 py-1 rounded-lg uppercase">{item.frstRegisterPnttmStr?.split(' ')[0] || '2026.02.17'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

DashboardListCard.displayName = 'DashboardListCard';

export { DashboardListCard };
