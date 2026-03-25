'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Home, ChevronRight } from 'lucide-react';
import { menuService } from '@/services/user/MenuService';
import { cn } from '@/lib/utils';

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
        
        if (!Array.isArray(menus)) return;
        
        // 게시판 ID(bbsId)가 쿼리 스트링에 있는 경우, 해당 메뉴를 우선 탐색
        const bbsIdParam = searchParams.get('bbsId');
        
        // 1. 메뉴 트리에서 현재 경로 또는 BBS ID가 연결된 메뉴 찾기
        const findPath = (menuList: any[], targetPath: string, searchBbsId?: string | null): boolean => {
          for (const menu of menuList) {
            // 현대화된 라우트(modernRoute)가 있고, 현재 경로와 일치하거나
            // 해당 메뉴의 쿼리 스트링에 bbsId가 포함되어 있는지 확인
            const isMatch = (menu.modernRoute && (targetPath === menu.modernRoute || targetPath.startsWith(menu.modernRoute + '/'))) 
                          || (searchBbsId && menu.modernRoute?.includes(`bbsId=${searchBbsId}`));

            if (isMatch) {
              path.push({ name: menu.menuNm, href: menu.modernRoute });
              return true;
            }
            if (menu.children && findPath(menu.children, targetPath, searchBbsId)) {
              path.unshift({ name: menu.menuNm, href: menu.modernRoute });
              return true;
            }
          }
          return false;
        };

        findPath(menus, pathname, bbsIdParam);
        
        // 만약 메뉴 트리에서 못 찾았다면 (관리자/특수 페이지 등)
        if (path.length === 0) {
          if (pathname.includes('/admin/system')) path.push({ name: '시스템 관리' });
          if (pathname.includes('/community/boards')) path.push({ name: '커뮤니티 및 콘텐츠' });
        }

        setItems(path);
      } catch (err) {
        console.error('Failed to resolve breadcrumb path', err);
      }
    };

    fetchPath();
  }, [pathname]);

  // 커스텀 아이템이 있으면 추가 (예: 게시글 제목 등)
  const finalItems = customItems.length > 0 ? customItems : items;

  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-3 px-5 rounded-full w-fit mb-4 border border-primary/5 shadow-sm">
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
            <span className={cn("font-black", index === finalItems.length - 1 ? "text-foreground" : "")}>
              {item.name}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
