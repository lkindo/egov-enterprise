'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  CalendarDays, 
  MessageSquare, 
  Settings, 
  Users, 
  ShieldCheck,
  CircleDot,
  UserCircle,
  LucideIcon
} from 'lucide-react';
import { menuService } from '@/services/menuService';
import { MenuInfo } from '@/types/menu';
import { SidebarItem } from './sidebar-item';

const ICON_MAP: Record<string, LucideIcon> = {
  '대시보드': LayoutDashboard,
  '휴가 관리': CalendarDays,
  '게시판': MessageSquare,
  '커뮤니티': Users,
  '사용자관리': Users,
  '보안관리': ShieldCheck,
  '시스템관리': Settings,
  '코드관리': Settings,
  '메뉴관리': Settings,
  '마이페이지': UserCircle,
  '기본': CircleDot
};

export function Sidebar() {
  const pathname = usePathname();
  const [menus, setMenus] = useState<MenuInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMenus() {
      try {
        // eGovFrame typically uses head menu first, then fetches left menus.
        // For a unified sidebar, we fetch the first tier's children.
        // Mocking: Assuming we want top level 0 children for now or all if API allows.
        const headData = await menuService.getHeadMenus();
        if (headData.success && headData.list.length > 0) {
          // Fetch children for each head menu or just show head menus as groups
          setMenus(headData.list);
        }
      } catch (error) {
        console.error('Failed to load sidebar menus', error);
      } finally {
        setLoading(false);
      }
    }
    loadMenus();
  }, []);

  if (loading) {
    return <aside className="fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-64 border-r bg-muted/30 p-4">
      <div className="space-y-2 animate-pulse">
        {[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-muted rounded-md" />)}
      </div>
    </aside>;
  }

  return (
    <aside className="fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-64 border-r bg-muted/30">
      <div className="flex flex-col h-full py-4 px-3 overflow-y-auto">
        <nav className="space-y-1">
          {menus.map((item) => {
            const Icon = ICON_MAP[item.menuNm] || ICON_MAP['기본'];
            // Map program URL to Next.js route if available, otherwise fallback
            const href = item.chkURL || `/${item.progrmFileNm?.toLowerCase() || ''}`;
            const isActive = pathname === href;
            
            return (
              <SidebarItem
                key={item.menuNo}
                item={item}
                isActive={isActive}
                Icon={Icon}
              />
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
