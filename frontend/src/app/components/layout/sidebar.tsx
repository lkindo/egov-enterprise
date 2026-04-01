'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarDays,
  MessageSquare,
  Settings,
  Users,
  FileText,
  ShieldCheck,
  CircleDot,
  ChevronDown,
  ChevronRight,
  UserCircle,
  Bell,
  Database,
  Search,
  BookOpen,
  ClipboardList,
  X,
  LayoutGrid,
  Briefcase,
  Library,
  UserCheck,
  Cpu,
  BarChart3,
  Sparkles,
  Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { menuService } from '@/services/foundation/system/MenuAdminService';
import { useLayout } from '@/contexts/LayoutContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MenuItem {
  menuNo: number;
  menuNm: string;
  upperMenuId: number;
  chkURL?: string;
  progrmFileNm?: string;
  modernRoute?: string;
  children?: MenuItem[];
}

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
  '협업': Users,
  '일정관리': CalendarDays,
  '스마트 일정/일지 관리': CalendarDays,
  '통계': LayoutDashboard,
  '감사 및 통계 모니터링': BarChart3,
  '도움말': BookOpen,
  '사용자지원': UserCheck,
  '설문조사': ClipboardList,
  '설문조사 및 투표 센터': ClipboardList,
  '마이페이지': UserCircle,
  '마이페이지관리': Settings,
  '공통코드관리': Database,
  '행정코드관리': Database,
  '기관코드수신': Database,
  '로그관리': FileText,
  '임직원 및 부서 관리': Building2,
  '기본': CircleDot
};

const DOMAIN_ICON_MAP: Record<number, any> = {
  10: LayoutGrid, // 워크스페이스
  11: MessageSquare, // 커뮤니티
  12: BookOpen, // 고객지원센터
  90: Settings, // 통합 관리 센터
  1000000: Briefcase, // Workspace (New Domain Layout)
  2000000: Library, // Community & Content (New Domain Layout)
  3000000: Sparkles, // Service & Operation (New Domain Layout)
};

const NavItem = ({ item, depth = 0 }: { item: MenuItem; depth?: number }) => {
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
    
    // Legacy mapping (expand as needed)
    if (formatted.includes('selectBoardList.do')) return '/admin/community/boards/selectBoardList';
    if (formatted.includes('AdminStats.do')) return '/admin/stats';
    if (formatted.includes('selectAddressBookList.do')) return '/admin/collaboration/address-book/selectAddressBookList';
    
    return formatted;
  }, [item.modernRoute, item.chkURL]);

  const isActive = useMemo(() => {
    if (href !== '#' && pathname.startsWith(href)) return true;
    if (hasChildren && item.children) {
      return item.children.some(child => {
        const childHref = child.modernRoute || child.chkURL;
        return childHref && pathname.startsWith(childHref.startsWith('/') ? childHref : `/${childHref}`);
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

  const handleLinkClick = (e: React.MouseEvent) => {
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

  const navContent = (
    <div className={cn(
      "flex items-center justify-between gap-3 px-3 py-2 text-sm font-semibold tracking-tight rounded-lg transition-all duration-200 w-full group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary relative",
      isActive
        ? "bg-primary/5 text-primary"
        : "text-muted-foreground hover:bg-accent hover:text-foreground",
      depth === 1 && "pl-10",
      depth === 2 && "pl-14",
      depth >= 3 && "pl-16",
      depth > 0 && "font-medium"
    )}>
      <div className="flex items-center gap-3">
        {Icon && depth === 0 && (
          <Icon
            size={18}
            className={cn(
              "transition-transform duration-200 group-hover:scale-110",
              isActive ? "text-primary" : "text-muted-foreground/60"
            )}
          />
        )}
        {depth > 0 && (
          <div className={cn(
            "absolute left-4 w-1.5 h-1.5 rounded-full border border-current opacity-40 transition-transform duration-200",
            isActive ? "bg-primary border-primary scale-110 opacity-100" : "group-hover:scale-110"
          )} 
          style={{ left: `${(depth * 12) + 12}px` }}
          />
        )}
        <span className={cn("truncate", depth > 0 && "text-[13px]")}>{item.menuNm}</span>
      </div>
      {hasChildren && (
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="opacity-50"
          onClick={(e) => {
            if (href !== '#') {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen(!isOpen);
            }
          }}
        >
          <ChevronDown size={14} />
        </motion.div>
      )}
    </div>
  );

  if (!isMounted) return null;

  return (
    <div className="w-full relative">
      <Link
        href={href}
        className="block w-full focus-visible:outline-none"
        onClick={handleLinkClick}
      >
        {navContent}
      </Link>

      <AnimatePresence initial={false}>
        {hasChildren && isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div className={cn(
              "mt-1 space-y-0.5 relative",
              depth === 0 && "ml-5 border-l border-border/40"
            )}>
              {item.children?.map((child, idx) => (
                <NavItem key={child.menuNo || `child-${idx}`} item={child} depth={depth + 1} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MobileDomainNode = ({
  domain,
  isActive,
  onSelect,
  menus,
  loading
}: {
  domain: any;
  isActive: boolean;
  onSelect: () => void;
  menus: MenuItem[];
  loading: boolean;
}) => {
  const Icon = DOMAIN_ICON_MAP[domain.menuNo] || CircleDot;

  return (
    <div className="mb-3">
      <button
        onClick={onSelect}
        className={cn(
          "flex items-center justify-between w-full px-4 py-3.5 rounded-xl transition-all duration-300 border text-sm font-semibold tracking-tight",
          isActive
            ? "bg-primary text-primary-foreground border-primary shadow-lg"
            : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/50 hover:text-foreground"
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
                  <div key={`domain-loading-${i}`} className="h-10 bg-muted/20 rounded-xl w-full" />
                ))}
              </div>
            ) : menus.length === 0 ? (
              <div className="p-4 text-center text-[10px] font-medium text-muted-foreground/40">
                하위 메뉴가 없습니다.
              </div>
            ) : (
              <div className="space-y-1 py-1">
                {menus.map((item, idx) => (
                  <NavItem key={item.menuNo || `mobile-menu-${idx}`} item={item} />
                ))}
              </div>
            )}
            <div className="h-6" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export function Sidebar({ initialMenus = [] }: { initialMenus?: any[] }) {
  const { isSidebarOpen, setSidebarOpen, activeMenuNo, setActiveMenuNo } = useLayout();
  const queryClient = useQueryClient();

  // Head Menus (Top Domains) Query
  const { data: topMenus = initialMenus } = useQuery({
    queryKey: ['menus', 'head'],
    queryFn: () => menuService.getHeadMenus(),
    initialData: initialMenus,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // Default activeMenuNo setting
  useEffect(() => {
    if (!activeMenuNo && topMenus.length > 0) {
      setActiveMenuNo(topMenus[0].menuNo);
    }
  }, [activeMenuNo, topMenus, setActiveMenuNo]);

  // Left Menus (Sub Menus) Query based on activeMenuNo
  const { data: menus = [], isLoading: loading } = useQuery({
    queryKey: ['menus', 'left', activeMenuNo],
    queryFn: async () => {
      if (!activeMenuNo) return [];
      
      // Check if it's already in the topMenus children (SSR pre-fetched data)
      const activeTop = topMenus.find(m => m.menuNo === activeMenuNo);
      if (activeTop?.children && activeTop.children.length > 0) {
        return activeTop.children;
      }
      
      return await menuService.getLeftMenus(activeMenuNo);
    },
    enabled: !!activeMenuNo, // Only run if activeMenuNo exists
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  return (
    <>
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside className={cn(
        "fixed left-0 top-0 lg:top-16 z-[100] h-full lg:h-[calc(100vh-4rem)] w-72 border-r bg-card transition-transform duration-500 lg:translate-x-0",
        isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full py-8 px-5 overflow-y-auto no-scrollbar">
          {/* Mobile Header in Sidebar */}
          <div className="flex items-center justify-between mb-10 px-2 lg:hidden">
            <Link href="/" className="flex items-center gap-3.5" onClick={() => setSidebarOpen(false)}>
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-primary-foreground font-bold text-lg">eG</span>
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tight leading-none text-foreground">엔터프라이즈</span>
                <span className="text-[10px] text-muted-foreground/60 font-semibold tracking-wider">포털 5.0</span>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="rounded-full w-10 h-10"
            >
              <X size={20} className="text-muted-foreground" />
            </Button>
          </div>

          <div className="flex-1">
            {/* Mobile View */}
            <div className="lg:hidden space-y-2">
              <div className="mb-6 px-2">
                <div className="text-[11px] font-bold text-muted-foreground/40 tracking-wider">
                  서비스 모듈
                </div>
              </div>
              {topMenus.map((domain, index) => (
                <MobileDomainNode
                  key={domain.menuNo || `domain-${index}`}
                  domain={domain}
                  isActive={activeMenuNo === domain.menuNo}
                  onSelect={() => setActiveMenuNo(domain.menuNo)}
                  menus={menus}
                  loading={loading}
                />
              ))}
            </div>

            {/* Desktop View */}
            <div className="hidden lg:block space-y-1">
              <div className="mb-6 px-2 flex items-center justify-between">
                <div className="text-[11px] font-bold text-muted-foreground/40 tracking-wider">
                  전체 메뉴
                </div>
                {topMenus.find(m => m.menuNo === activeMenuNo) && (
                  <Badge variant="secondary" className="text-[9px] px-2 py-0 border-none">
                    {topMenus.find(m => m.menuNo === activeMenuNo)?.menuNm}
                  </Badge>
                )}
              </div>

              {loading ? (
                <div className="space-y-4 animate-pulse">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={`loading-${i}`} className="h-10 bg-muted/30 rounded-lg w-full" />
                  ))}
                </div>
              ) : menus.length === 0 ? (
                <div className="p-8 text-center space-y-3 opacity-20">
                  <Database size={32} className="mx-auto" />
                  <p className="text-sm font-bold tracking-tight">메뉴를 불러올 수 없습니다.</p>
                </div>
              ) : (
                <nav className="space-y-1">
                  {menus.map((item: any, index: number) => (
                    <NavItem key={item.menuNo || `menu-${index}`} item={item} />
                  ))}
                </nav>
              )}
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="mt-auto pt-12 px-2">
            <div className="p-4 rounded-xl bg-muted/20 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-primary" />
                <span className="text-[10px] font-bold text-primary tracking-tight">eGovFrame 5.0</span>
              </div>
              <p className="text-[9px] font-medium text-muted-foreground/50 leading-relaxed">
                현대화된 엔터프라이즈 UI 키트
                <br />
                최종 버전 1.0.2
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
