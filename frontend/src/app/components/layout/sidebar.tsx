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
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { menuService } from '@/services/menuService';
import { useLayout } from '@/contexts/LayoutContext';

interface MenuItem {
  menuNo: number;
  menuNm: string;
  upperMenuId: number;
  chkURL?: string;
  progrmFileNm?: string;
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

// Helper to map legacy .do URLs to Next.js routes
const mapLegacyUrl = (url: string) => {
  if (!url || url === '#') return '#';

  // Board list mapping
  if (url.includes('selectBoardList.do')) {
    const bbsId = new URLSearchParams(url.split('?')[1]).get('bbsId');
    return `/cop/bbs/selectBoardList?bbsId=${bbsId}`;
  }

  // Board detail mapping
  if (url.includes('selectBoardArticle.do')) {
    const search = url.split('?')[1];
    const params = new URLSearchParams(search);
    const bbsId = params.get('bbsId');
    const nttId = params.get('nttId');
    return `/cop/bbs/selectBoardArticle/${nttId}?bbsId=${bbsId}`;
  }

  // Community mapping
  if (url.includes('EgovCmmntyList.do')) {
    return '/cop/cmy/selectCommunityList';
  }

  // Address Book mapping
  if (url.includes('EgovAddressBookList.do')) {
    return '/cop/adb/selectAddressBookList';
  }

  // Schedule mapping
  if (url.includes('EgovSchdulManageList.do')) {
    return '/cop/smt/sim/selectScheduleList';
  }

  // Scrap mapping
  if (url.includes('EgovScrapList.do')) {
    return '/cop/scp/selectScrapList';
  }

  // DeptJob mapping
  if (url.includes('EgovDeptJobBxList.do')) {
    return '/cop/smt/djm/selectDeptJobList';
  }

  // Survey mapping
  if (url.includes('EgovQustnrRespondInfoList.do')) {
    return '/survey';
  }

  return url;
};

function NavItem({ item, depth = 0 }: { item: MenuItem; depth?: number }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const hasChildren = item.children && item.children.length > 0;
  const Icon = ICON_MAP[item.menuNm] || (depth === 0 ? ICON_MAP['기본'] : null);

  // Normalize and map href
  const href = useMemo(() => mapLegacyUrl(item.chkURL || '#'), [item.chkURL]);
  const isActive = pathname === href || (hasChildren && item.children?.some(child => mapLegacyUrl(child.chkURL || '#') === pathname));

  useEffect(() => {
    if (isActive && hasChildren) {
      setIsOpen(true);
    }
  }, [isActive, hasChildren]);

  const content = (
    <div className={cn(
      "flex items-center justify-between gap-3 px-3 py-2 text-sm font-bold tracking-tight rounded-md transition-colors w-full",
      isActive
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-accent hover:text-foreground",
      depth > 0 && "pl-9"
    )}>
      <div className="flex items-center gap-3">
        {Icon && <Icon size={18} className={cn(isActive ? "text-primary" : "text-muted-foreground")} />}
        <span>{item.menuNm}</span>
      </div>
      {hasChildren && (
        isOpen ? <ChevronDown size={14} className="opacity-50" /> : <ChevronRight size={14} className="opacity-50" />
      )}
    </div>
  );

  return (
    <div className="w-full">
      {hasChildren ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full text-left"
        >
          {content}
        </button>
      ) : (
        <Link href={href} className="block w-full">
          {content}
        </Link>
      )}

      {hasChildren && isOpen && (
        <div className="mt-1 space-y-1">
          {item.children?.map((child) => (
            <NavItem key={child.menuNo} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ initialMenus = [] }: { initialMenus?: MenuItem[] }) {
  const [menus, setMenus] = useState<MenuItem[]>(initialMenus);
  const [loading, setLoading] = useState(initialMenus.length === 0);
  const { isSidebarOpen, setSidebarOpen } = useLayout();

  useEffect(() => {
    if (initialMenus.length > 0) {
      setMenus(initialMenus);
      setLoading(false);
      return;
    }

    async function loadMenus() {
      try {
        setLoading(true);
        const headList = await menuService.getHeadMenus();
        const menusWithChildren = await Promise.all(
          headList.map(async (menu) => {
            try {
              const leftList = await menuService.getLeftMenus(menu.menuNo);
              return { ...menu, children: leftList };
            } catch {
              return { ...menu, children: [] };
            }
          })
        );
        setMenus(menusWithChildren);
      } catch (error) {
        console.error('Failed to load sidebar menus', error);
        setMenus([]);
      } finally {
        setLoading(false);
      }
    }
    loadMenus();
  }, [initialMenus]);

  return (
    <>
      {/* Mobile Overlay */}
      {isSidebarOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden animate-in fade-in duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside className={cn(
        "fixed left-0 top-0 lg:top-16 z-[100] h-full lg:h-[calc(100vh-4rem)] w-64 border-r bg-white dark:bg-slate-950 overflow-y-auto transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-2xl",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full py-6 px-4">
          {/* Mobile Header in Sidebar */}
          <div className="flex items-center justify-between mb-6 px-2 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="text-primary-foreground font-black text-sm">eG</span>
              </div>
              <span className="text-sm font-black tracking-tight uppercase">Enterprise</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 hover:bg-accent rounded-full transition-colors"
            >
              <X size={20} className="text-muted-foreground" />
            </button>
          </div>

          <div className="mb-4 px-2 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-50">
            Navigation Menu
          </div>

          {loading ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-10 bg-muted/50 rounded-lg w-full" />
              ))}
            </div>
          ) : menus.length === 0 ? (
            <div className="p-4 text-center space-y-2 opacity-40">
              <Database size={24} className="mx-auto" />
              <p className="text-[10px] font-bold">메뉴를 불러올 수 없습니다.</p>
            </div>
          ) : (
            <nav className="space-y-2">
              {menus.map((item) => (
                <NavItem key={item.menuNo} item={item} />
              ))}
            </nav>
          )}

          {/* Sidebar Footer - Only visible on mobile if needed */}
          <div className="mt-auto pt-10 px-2 lg:hidden">
            <p className="text-[10px] font-bold text-muted-foreground/40 text-center uppercase tracking-widest">
              eGov Frame 5.0 Modernized
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
