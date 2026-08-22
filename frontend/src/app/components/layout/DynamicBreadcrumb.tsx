'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Home, ChevronRight } from 'lucide-react';
import { menuService } from '@/services/business/user/MenuService';
import { cn } from '@/lib/utils';
import type { MenuInfo } from '@/types/foundation/menu';
import {
  normalizeInternalRoute,
  resolveMenuInternalRoute,
} from '@/lib/navigation/internal-route';

interface BreadcrumbItem {
  name: string;
  href?: string;
}

export function DynamicBreadcrumb({ customItems = [] }: { customItems?: BreadcrumbItem[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<BreadcrumbItem[]>([]);

  useEffect(() => {
    const fetchPath = async () => {
      try {
        const menus = await menuService.getHeadMenus() || [];
        const path: BreadcrumbItem[] = [];
        
        if (!Array.isArray(menus)) {
          setItems([]);
          return;
        }
        
        // 게시판 ID(bbsId)가 쿼리 스트링에 있는 경우, 해당 메뉴를 우선 탐색
        const bbsIdParam = searchParams.get('bbsId');
        
        // 1. 메뉴 트리에서 현재 경로 또는 BBS ID가 연결된 메뉴 찾기
        const findPath = (menuList: MenuInfo[], targetPath: string, searchBbsId?: string | null): boolean => {
          for (const menu of menuList) {
            const route = resolveMenuInternalRoute(menu);
            const routePath = route?.split(/[?#]/, 1)[0];
            const routeBbsId = route
              ? new URL(route, 'https://egov.invalid').searchParams.get('bbsId')
              : null;
            const isMatch = Boolean(
              routePath
              && (
                targetPath === routePath
                || targetPath.startsWith(`${routePath}/`)
                || (searchBbsId && routeBbsId === searchBbsId)
              )
            );

            if (isMatch) {
              path.push({ name: menu.menuNm, href: route ?? undefined });
              return true;
            }
            if (menu.children && findPath(menu.children, targetPath, searchBbsId)) {
              path.unshift({ name: menu.menuNm, href: route ?? undefined });
              return true;
            }
          }
          return false;
        };

        findPath(menus, pathname || '', bbsIdParam);
        
        // 만약 메뉴 트리에서 못 찾았다면 (관리자/특수 페이지 등)
        if (path.length === 0) {
          if (pathname?.includes('/admin/system')) path.push({ name: '시스템 관리' });
          if (pathname?.includes('/community/boards')) path.push({ name: '커뮤니티 및 콘텐츠' });
        }

        setItems(path);
      } catch {
        setItems([]);
      }
    };

    fetchPath();
  }, [pathname, searchParams]);

  const finalItems = (customItems.length > 0 ? customItems : items).map(item => ({
    ...item,
    href: normalizeInternalRoute(item.href) ?? undefined,
  }));

  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-3 px-5 rounded-lg w-fit mb-4 border border-primary/5 shadow-sm">
      <Link href="/" className="hover:text-foreground flex items-center gap-1.5 transition-colors">
        <Home className="w-4 h-4" /> 홈
      </Link>
      
      {finalItems.map((item, index) => (
        <React.Fragment key={`${item.name}-${index}`}>
          <ChevronRight className="w-4 h-4 opacity-30" />
          {item.href && index < finalItems.length - 1 ? (
            <Link href={item.href} className="hover:text-primary transition-colors font-bold">
              {item.name}
            </Link>
          ) : (
            <span className={cn("font-bold", index === finalItems.length - 1 ? "text-foreground" : "")}>
              {item.name}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
