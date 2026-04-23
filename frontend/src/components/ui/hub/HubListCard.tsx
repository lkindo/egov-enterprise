import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, AlertCircle, LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface HubListItem {
  id?: string | number;
  nttId?: string | number;
  title?: string;
  nttSj?: string;
  date?: string;
  frstRegisterPnttmStr?: string;
  isNew?: boolean;
}

export interface HubListCardProps {
  title: string;
  items: HubListItem[];
  icon: React.ReactNode | LucideIcon;
  moreHref?: string;
  color?: 'blue' | 'emerald' | 'amber' | 'rose';
  className?: string;
}

const colorMap: Record<string, string> = {
  blue: "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400",
  emerald: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400",
  rose: "bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400"
};

const itemHoverColorMap: Record<string, string> = {
  blue: "group-hover/item:border-blue-500/30 group-hover/item:bg-blue-50/50 dark:group-hover/item:bg-blue-500/5",
  emerald: "group-hover/item:border-emerald-500/30 group-hover/item:bg-emerald-50/50 dark:group-hover/item:bg-emerald-500/5",
  amber: "group-hover/item:border-amber-500/30 group-hover/item:bg-amber-50/50 dark:group-hover/item:bg-amber-500/5",
  rose: "group-hover/item:border-rose-500/30 group-hover/item:bg-rose-50/50 dark:group-hover/item:bg-rose-500/5"
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
  const renderIcon = () => {
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === 'function' || (icon && (icon as any).render)) {
      const Icon = icon as any;
      return <Icon size={20} />;
    }
    return null;
  };

  return (
    <motion.div
      variants={listVariants}
      className={cn(
        "hub-card-premium flex flex-col h-[480px] group overflow-hidden",
        className
      )}
    >
      <div className="px-10 py-10 border-b border-primary/5 flex items-center justify-between bg-card">
        <h3 className="font-black text-2xl flex items-center gap-4 tracking-tight">
          <div className={cn("w-10 h-10 rounded-[0.1rem] flex items-center justify-center", colorMap[color])}>
            {renderIcon()}
          </div>
          {title}
        </h3>
        {moreHref && (
          <Link
            href={moreHref}
            className="w-12 h-12 bg-muted/30 rounded-[0.1rem] flex items-center justify-center text-muted-foreground hover:text-primary hover:scale-110 transition focus-visible:focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={`${title} ?붾낫湲?}
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
              key={`list-item-${title}-${item.id || item.nttId || idx}`}
              whileHover={{ x: 5 }}
              className={cn(
                "flex flex-col gap-2 p-6 rounded-[0.1rem] border border-transparent transition cursor-pointer group/item",
                itemHoverColorMap[color]
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-muted-foreground/40 tracking-tight tabular-nums">
                  {item.date || item.frstRegisterPnttmStr?.split(' ')[0] || '-'}
                </span>
                <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-white/10 group-hover/item:bg-primary transition-colors" />
              </div>
              <span className="text-[15px] font-black text-foreground line-clamp-1 tracking-tight">
                {item.title || item.nttSj}
              </span>
            </motion.div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-30 gap-4">
            <AlertCircle size={40} />
            <p className="text-sm font-black tracking-tight">?곗씠?곌? ?놁뒿?덈떎.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
