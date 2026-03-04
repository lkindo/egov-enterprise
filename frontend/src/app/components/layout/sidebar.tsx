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
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { menuService } from '@/services/user/MenuService';
import { useLayout } from '@/contexts/LayoutContext';
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
  '보안관리': ShieldCheck,
  '시스템관리': Settings,
  '시스템 설정': Settings,
  '게시판': MessageSquare,
  '협업': Users,
  '일정관리': CalendarDays,
  '통계': LayoutDashboard,
  '도움말': BookOpen,
  '설문조사': ClipboardList,
  '마이페이지': UserCircle,
  '공통코드관리': Database,
  '로그관리': FileText,
  '기본': CircleDot
};

const DOMAIN_ICON_MAP: Record<number, any> = {
  10: LayoutGrid,    // 워크스페이스
  20: Briefcase,     // 운영 지원
  30: Library,       // 지식 자산
  40: UserCheck,     // 계정 및 권한
  50: Cpu,           // 시스템 관리
  60: BarChart3,     // 인사이트
};

const NavItem = ({ item, depth = 0 }: { item: MenuItem; depth?: number }) => {
  const pathname = usePathname();
  const { setSidebarOpen } = useLayout();
  const hasChildren = item.children && item.children.length > 0;
  const [isOpen, setIsOpen] = useState(false);
  const Icon = ICON_MAP[item.menuNm] || ICON_MAP['기본'];

  const href = useMemo(() => {
    return item.modernRoute || item.chkURL || '#';
  }, [item.modernRoute, item.chkURL]);

  const isActive = useMemo(() => {
    if (pathname === href) return true;
    if (hasChildren && item.children) {
      return item.children.some(child => {
        const childHref = child.modernRoute || child.chkURL || '#';
        return pathname === childHref;
      });
    }
    return false;
  }, [pathname, href, hasChildren, item.children]);

  useEffect(() => {
    if (isActive && hasChildren) {
      setIsOpen(true);
    }
  }, [isActive, hasChildren]);

  const content = (
    <div className={cn(
      "flex items-center justify-between gap-3 px-3 py-2.5 text-sm font-bold tracking-tight rounded-lg transition-all duration-200 w-full group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
      isActive
        ? "bg-primary/10 text-primary shadow-sm shadow-primary/5"
        : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground",
      depth > 0 && "pl-10"
    )}>
      <div className="flex items-center gap-3">
        {Icon && (
          <Icon
            size={18}
            className={cn(
              "transition-transform duration-200 group-hover:scale-110",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          />
        )}
        <span className="truncate">{item.menuNm}</span>
      </div>
      {hasChildren && (
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="opacity-50"
        >
          <ChevronDown size={14} />
        </motion.div>
      )}
    </div>
  );

  return (
    <div className="w-full">
      {hasChildren ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full text-left focus-visible:outline-none"
          aria-expanded={isOpen}
          aria-label={`${item.menuNm} 메뉴 ${isOpen ? '닫기' : '열기'}`}
        >
          {content}
        </button>
      ) : (
        <Link
          href={href}
          className="block w-full focus-visible:outline-none"
          onClick={() => {
            setSidebarOpen(false);
            if (href.endsWith('.do')) {
              console.warn(`Navigation Warning: Legacy URL detected: ${href}`);
            }
          }}
        >
          {content}
        </Link>
      )}

      <AnimatePresence initial={false}>
        {hasChildren && isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-1 space-y-1">
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
          "flex items-center justify-between w-full px-4 py-3.5 rounded-2xl transition-all duration-500 border font-black text-xs uppercase tracking-widest",
          isActive
            ? "bg-primary text-primary-foreground border-primary shadow-xl shadow-primary/25 scale-[0.98] ring-4 ring-primary/5"
            : "bg-muted/10 text-muted-foreground/80 border-transparent hover:bg-muted/30 hover:text-foreground"
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
              <div className="p-4 text-center text-[10px] font-bold text-muted-foreground/40 italic">
                하위 메뉴가 없습니다.
              </div>
            ) : (
              <div className="space-y-1.5 py-1">
                {menus.map((item, idx) => (
                  <NavItem key={item.menuNo || `mobile-menu-${idx}`} item={item} />
                ))}
              </div>
            )}
            <div className="h-6" /> {/* Spacer */}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export function Sidebar() {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [topMenus, setTopMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { isSidebarOpen, setSidebarOpen, activeMenuNo, setActiveMenuNo } = useLayout();

  useEffect(() => {
    menuService.getHeadMenus().then(res => setTopMenus(res || []));
  }, []);

  useEffect(() => {
    if (!activeMenuNo && topMenus.length > 0) {
      setActiveMenuNo(topMenus[0].menuNo);
      return;
    }

    async function loadMenus() {
      if (!activeMenuNo) return;
      try {
        setLoading(true);
        const leftList = await menuService.getLeftMenus(activeMenuNo);
        setMenus(leftList);
      } catch (error) {
        console.error('Failed to load sidebar menus', error);
        setMenus([]);
      } finally {
        setLoading(false);
      }
    }
    loadMenus();
  }, [activeMenuNo, topMenus, setActiveMenuNo]);

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside className={cn(
        "fixed left-0 top-0 lg:top-16 z-[100] h-full lg:h-[calc(100vh-4rem)] w-72 border-r bg-white dark:bg-slate-950 overflow-y-auto no-scrollbar transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) lg:translate-x-0",
        isSidebarOpen ? "translate-x-0 shadow-[40px_0_80px_-20px_rgba(0,0,0,0.4)]" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full py-8 px-5">
          {/* Mobile Header in Sidebar */}
          <div className="flex items-center justify-between mb-10 px-2 lg:hidden">
            <Link href="/" className="flex items-center gap-3.5" onClick={() => setSidebarOpen(false)}>
              <div className="w-11 h-11 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/30 rotate-2">
                <span className="text-primary-foreground font-black text-xl -rotate-2">eG</span>
              </div>
              <div className="flex flex-col">
                <span className="text-base font-black tracking-tighter uppercase leading-none">엔터프라이즈</span>
                <span className="text-[10px] text-muted-foreground/60 font-black tracking-[0.3em]">포털 5.0</span>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="rounded-full bg-muted/40 hover:bg-muted w-10 h-10 transition-transform active:scale-90"
            >
              <X size={20} className="text-muted-foreground" />
            </Button>
          </div>

          <div className="flex-1">
            {/* Mobile: Unified Hierarchical View */}
            <div className="lg:hidden space-y-2">
              <div className="mb-6 px-2">
                <div className="text-[11px] font-black text-muted-foreground/40 uppercase tracking-[0.25em]">
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

            {/* Desktop: Standard Vertical Navigation */}
            <div className="hidden lg:block space-y-1">
              <div className="mb-6 px-2 flex items-center justify-between">
                <div className="text-[11px] font-black text-muted-foreground/40 uppercase tracking-[0.25em]">
                  전체 메뉴
                </div>
                {topMenus.find(m => m.menuNo === activeMenuNo) && (
                  <Badge variant="outline" className="text-[9px] px-2 py-0 border-primary/20 bg-primary/5 text-primary">
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
                  <p className="text-xs font-bold tracking-tight">메뉴를 불러올 수 없습니다.</p>
                </div>
              ) : (
                <nav className="space-y-1.5">
                  {menus.map((item, index) => (
                    <NavItem key={item.menuNo || `menu-${index}`} item={item} />
                  ))}
                </nav>
              )}
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="mt-auto pt-12 px-2">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent border border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-primary" />
                <span className="text-[10px] font-black text-primary uppercase tracking-tighter">eGovFrame 5.0</span>
              </div>
              <p className="text-[9px] font-bold text-muted-foreground/50 leading-relaxed uppercase tracking-widest">
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
