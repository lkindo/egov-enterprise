'use client';

import {
  ChevronRight,
  CircleDot,
  LayoutGrid,
  MessageSquare,
  BookOpen,
  Settings,
  Briefcase,
  Library,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { MenuInfo } from '@/types/foundation/menu';
import { NavItem, NavQueryScope } from './NavItem';

const DOMAIN_ICON_MAP: Record<number, any> = {
  10: LayoutGrid, // 워크스페이스
  11: MessageSquare, // 커뮤니티
  12: BookOpen, // 고객지원센터
  90: Settings, // 통합 관리 센터
  1000000: Briefcase, // Workspace (New Domain Layout)
  2000000: Library, // Community & Content (New Domain Layout)
  3000000: Sparkles, // Service & Operation (New Domain Layout)
};

interface MobileDomainNodeProps {
  domain: MenuInfo;
  isActive: boolean;
  onSelect: () => void;
  menus: MenuInfo[];
  loading: boolean;
}

export function MobileDomainNode({
  domain,
  isActive,
  onSelect,
  menus,
  loading
}: MobileDomainNodeProps) {
  const Icon = DOMAIN_ICON_MAP[domain.menuNo] || CircleDot;

  return (
    <div className="mb-3">
      <button
        onClick={onSelect}
        className={cn(
          "flex items-center justify-between w-full px-4 py-3.5 rounded-[var(--radius-hub-item)] transition-all duration-300 border text-xs font-bold tracking-tight",
          isActive
            ? "bg-surface-inverse text-surface-inverse-foreground border-surface-inverse-border shadow-xl"
            : "bg-muted text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
        )}
      >
        <div className="flex items-center gap-3.5">
          <Icon size={18} className={cn("transition-transform duration-500", isActive ? "scale-110 active-icon" : "opacity-50")} />
          <span>{domain.menuNm}</span>
        </div>
        <ChevronRight
          size={16}
          className={cn(
            "transition-all duration-500",
            isActive ? "rotate-90 opacity-100 translate-x-1" : "opacity-30"
          )}
        />
      </button>

      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden mt-3 px-1"
          >
            {loading ? (
              <div className="space-y-3 py-2 animate-pulse pl-4">
                {[1, 2, 3].map(i => (
                  <div key={`domain-loading-${i}`} className="h-10 bg-muted/20 rounded-[var(--radius-hub-item)] w-full" />
                ))}
              </div>
            ) : menus.length === 0 ? (
              <div className="p-4 text-center text-xs font-medium text-muted-foreground/40">
                하위 메뉴가 없습니다.
              </div>
            ) : (
              <div className="space-y-1 py-1">
                <NavQueryScope menus={menus}>
                  {menus.map((item, idx) => (
                    <NavItem key={item.menuNo || `mobile-menu-${idx}`} item={item} />
                  ))}
                </NavQueryScope>
              </div>
            )}
            <div className="h-6" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
