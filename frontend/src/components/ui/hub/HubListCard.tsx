import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { HubIcon, renderHubIcon } from './hub-icon';

interface HubListItem {
  id?: string | number;
  pstSn?: number;
  title?: string;
  pstTtl?: string;
  date?: string;
  frstRegisterPnttmStr?: string;
  isNew?: boolean;
}

export interface HubListCardProps {
  title: string;
  items: HubListItem[];
  icon: HubIcon;
  moreHref?: string;
  color?: 'blue' | 'emerald' | 'amber' | 'rose';
  className?: string;
}

// hub-* 토큰이 다크에서 재정의되므로(themes/*.css) blue 와 동일한 토큰 패턴으로 통일한다.
// 종전의 dark: 리터럴들은 토큰 다크값 부재를 메우던 fallback 이었다.
const colorMap: Record<string, string> = {
  blue: "bg-hub-blue/10 text-hub-blue",
  emerald: "bg-hub-emerald/10 text-hub-emerald",
  amber: "bg-hub-amber/10 text-hub-amber",
  rose: "bg-hub-rose/10 text-hub-rose"
};

const itemHoverColorMap: Record<string, string> = {
  blue: "group-hover/item:border-hub-blue/30 group-hover/item:bg-hub-blue/5",
  emerald: "group-hover/item:border-hub-emerald/30 group-hover/item:bg-hub-emerald/5",
  amber: "group-hover/item:border-hub-amber/30 group-hover/item:bg-hub-amber/5",
  rose: "group-hover/item:border-hub-rose/30 group-hover/item:bg-hub-rose/5"
};

const listVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

export function HubListCard({ 
  title, 
  items, 
  icon, 
  moreHref, 
  color = 'blue',
  className
}: HubListCardProps) {
  return (
    <motion.div
      variants={listVariants}
      className={cn(
        "hub-card-premium flex flex-col h-[480px] group overflow-hidden",
        className
      )}
    >
      <div className="px-10 py-10 border-b border-primary/5 flex items-center justify-between bg-card">
        <h3 className="font-bold text-2xl flex items-center gap-4 tracking-tight">
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", colorMap[color])}>
            {renderHubIcon(icon, 20)}
          </div>
          {title}
        </h3>
        {moreHref && (
          <Link
            href={moreHref}
            className="w-12 h-12 bg-muted/30 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:scale-110 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={`${title} 상세보기`}
          >
            <ArrowRight size={20} />
          </Link>
        )}
      </div>
      <div 
        className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar"
        style={{ contentVisibility: 'auto', containIntrinsicSize: '0 400px' } as React.CSSProperties}
      >
        {items && items.length > 0 ? (
          items.slice(0, 6).map((item, idx) => (
            <motion.div
              key={`list-item-${title}-${item.id || item.pstSn || idx}`}
              whileHover={{ x: 5 }}
              className={cn(
                "flex flex-col gap-2 p-6 rounded-lg border border-transparent transition-all cursor-pointer group/item",
                itemHoverColorMap[color]
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground/40 tracking-tight tabular-nums">
                  {item.date || item.frstRegisterPnttmStr?.split(' ')[0] || '-'}
                </span>
                <div className="w-1.5 h-1.5 rounded-full bg-border group-hover/item:bg-primary transition-colors" />
              </div>
              <span className="text-[15px] font-bold text-foreground line-clamp-1 tracking-tight">
                {item.title || item.pstTtl}
              </span>
            </motion.div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-30 gap-4">
            <AlertCircle size={40} />
            <p className="text-sm font-bold tracking-tight">데이터가 없습니다.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
