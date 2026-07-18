'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarDays,
  MessageSquare,
  Settings,
  Users,
  ShieldCheck,
  CircleDot,
  ChevronDown,
  UserCircle,
  BarChart3,
  BookOpen,
  ClipboardList,
  FileText,
  Building2,
  Database
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useLayout } from '@/contexts/LayoutContext';
import { useAuth } from '@/contexts/AuthContext';
import { MenuInfo } from '@/types/foundation/menu';

const ICON_MAP: Record<string, any> = {
  '대시보드': LayoutDashboard,
  '관리자': Settings,
  '사용자관리': Users,
  '사용자 계정 및 권한 관리': Users,
  '보안관리': ShieldCheck,
  '통합 보안 및 접속 정책': ShieldCheck,
  '시스템관리': Settings,
  '시스템 설정': Settings,
  '게시판': MessageSquare,
  '업무': Users,
  '일정관리': CalendarDays,
  '스마트 일정/일지 관리': CalendarDays,
  '통계': LayoutDashboard,
  '감사 및 통계 모니터링': BarChart3,
  '알림마당': BookOpen,
  '사용자지원': UserCheckIcon,
  '설문조사': ClipboardList,
  '설문조사 및 투표 센터': ClipboardList,
  '마이페이지': UserCircle,
  '마이페이지관리': Settings,
  '공통코드관리': Database,
  '행정코드관리': Database,
  '기관코드수신': Database,
  '로그관리': FileText,
  '조직도 및 부서 관리': Building2,
  '기본': CircleDot
};

// Users 아이콘이 이미 임포트되어 있으므로 UserCheck를 명시적으로 대응합니다.
function UserCheckIcon(props: any) {
  return <Users {...props} />;
}

interface NavItemProps {
  item: MenuInfo;
  depth?: number;
}

export function NavItem({ item, depth = 0 }: NavItemProps) {
  const pathname = usePathname();
  const { setSidebarOpen } = useLayout();
  const hasChildren = item.children && item.children.length > 0;
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const Icon = ICON_MAP[item.menuNm] || ICON_MAP['기본'];

  // URL normalization and mapping
  const href = useMemo(() => {
    const rawUrl = item.modernRoute || item.chkURL;
    if (!rawUrl || rawUrl === '#') return '#';
    
    // Ensure leading slash for internal links
    const formatted = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
    
    return formatted;
  }, [item.modernRoute, item.chkURL]);

  const isActive = useMemo(() => {
    if (href !== '#' && String(pathname).startsWith(String(href))) return true;
    if (hasChildren && item.children) {
      return item.children.some(child => {
        const childHref = child.modernRoute || child.chkURL;
        return childHref && String(pathname).startsWith(String(childHref).startsWith('/') ? String(childHref) : `/${String(childHref)}`);
      });
    }
    return false;
  }, [pathname, href, hasChildren, item.children]);

  useEffect(() => {
    setIsMounted(true);
    if (isActive && hasChildren) {
      setIsOpen(true);
    }
  }, [isActive, hasChildren]);

  const { user } = useAuth();
  const isAdmin = user?.role === 'ROLE_ADMIN' || user?.userSe === 'USR';
  
  const isRestricted = false;

  const handleLinkClick = (e: React.MouseEvent) => {
    if (isRestricted) {
      e.preventDefault();
      return;
    }
    setSidebarOpen(false);
    if (href === '#') {
      if (hasChildren) {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
    } else if (href.endsWith('.do')) {
      console.warn(`[Sidebar] Legacy URL detected: ${href}`);
    }
  };

  const isDummyLink = href === '#';

  const innerContent = (
    <div className={cn(
      "flex items-center justify-between gap-3 px-3 py-2.5 text-[13px] font-bold tracking-tight rounded-[var(--radius-hub-item)] transition-all duration-300 w-full group focus-visible:outline-none relative hover:translate-x-1 hover:bg-surface-inverse hover:text-surface-inverse-foreground",
      isActive
        ? "bg-surface-inverse text-surface-inverse-foreground shadow-xl"
        : "text-muted-foreground hover:bg-surface-inverse hover:text-surface-inverse-foreground",
      isRestricted && "opacity-40 cursor-not-allowed grayscale",
      depth === 1 && "pl-10",
      depth === 2 && "pl-14",
      depth >= 3 && "pl-16",
      depth > 0 && "font-bold"
    )}>
      <div className="flex items-center gap-3">
        {Icon && depth === 0 && (
          <Icon
            size={18}
            className={cn(
              "transition-transform duration-200 group-hover:scale-110",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          />
        )}
        {depth > 0 && (
          <div className={cn(
            "absolute left-4 w-1.5 h-1.5 rounded-full border border-current opacity-80 transition-transform duration-200",
            isActive ? "bg-primary border-primary scale-110 opacity-100" : "group-hover:scale-110"
          )} 
          style={{ left: `${(depth * 12) + 12}px` }}
          />
        )}
        <span className={cn("truncate", depth > 0 && "text-[13px]")}>{item.menuNm}</span>
      </div>
      {hasChildren && (
        <div
          className="p-1 hover:bg-white/10 rounded-md transition-colors"
          onClick={(e) => {
            if (!isDummyLink) {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen(!isOpen);
            }
          }}
        >
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="opacity-100"
          >
            <ChevronDown size={14} />
          </motion.div>
        </div>
      )}
    </div>
  );

  if (!isMounted) return null;

  return (
    <div className="w-full relative">
      {isDummyLink ? (
        <button
          type="button"
          aria-expanded={isOpen}
          aria-label={`${item.menuNm} 하위 메뉴 토글`}
          className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-[var(--radius-hub-item)]"
          onClick={() => setIsOpen(!isOpen)}
        >
          {innerContent}
        </button>
      ) : (
        <Link
          href={href}
          className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-[var(--radius-hub-item)]"
          onClick={handleLinkClick}
        >
          {innerContent}
        </Link>
      )}

      {hasChildren && isOpen && (
        <div className={cn(
          "mt-1 space-y-0.5 relative",
          depth === 0 && "ml-5 border-l border-border/40"
        )}>
          {item.children?.map((child, idx) => (
            <NavItem key={child.menuNo || `child-${idx}`} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
