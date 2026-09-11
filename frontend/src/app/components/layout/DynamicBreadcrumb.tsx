'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Home, ChevronRight } from 'lucide-react';
import { menuService } from '@/services/business/user/MenuService';
import { cn } from '@/lib/utils';
import { findActiveMenu } from '@/lib/navigation/active-menu';
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
        
        const match = findActiveMenu(menus, pathname || '', searchParams);
        for (const menu of match?.path ?? []) {
          path.push({ name: menu.menuNm, href: resolveMenuInternalRoute(menu) ?? undefined });
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
    // [2026-08-22 KRDS/WCAG 정렬] 브레드크럼은 ① nav 에 접근 이름 ② 순서 목록(ol/li) 시맨틱
    // ③ 현재 위치 aria-current="page" ④ 장식 구분자 aria-hidden 이 규격이다.
    // 종전에는 이름 없는 <nav> 안에 평평한 Link/span 나열이라, 스크린리더가 "몇 단계 중
    // 어디인가"도 "여기가 현재 페이지인가"도 알 수 없었다.
    <nav
      aria-label="현재 위치"
      className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-3 px-5 rounded-lg w-fit mb-4 border border-primary/5 shadow-sm"
    >
      <ol className="flex items-center gap-2">
        <li>
          <Link href="/" className="hover:text-foreground flex items-center gap-1.5 transition-colors">
            <Home className="w-4 h-4" aria-hidden="true" /> 홈
          </Link>
        </li>

        {finalItems.map((item, index) => {
          const isCurrent = index === finalItems.length - 1;
          return (
            <li key={`${item.name}-${index}`} className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 opacity-30" aria-hidden="true" />
              {item.href && !isCurrent ? (
                <Link href={item.href} className="hover:text-primary transition-colors font-bold">
                  {item.name}
                </Link>
              ) : (
                <span
                  aria-current={isCurrent ? 'page' : undefined}
                  className={cn("font-bold", isCurrent ? "text-foreground" : "")}
                >
                  {item.name}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
