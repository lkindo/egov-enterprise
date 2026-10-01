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

/**
 * 현재 위치 경로.
 *
 * [2026-10-01] 메뉴 트리 경로를 기본으로 한다. 종전에는 화면이 넘긴 고정 경로(customItems)가 있으면 메뉴 트리를
 * 통째로 덮어써, 56개 화면이 '시스템관리'·'운영지원'·'부가서비스' 같은 옛 이름을 누를 수 없는 형태로 보였다 —
 * 사이드바에서 들어온 위치와 경로가 달랐다. 이제 화면 고정 경로는 ① 메뉴 트리에 없는 화면의 대체값과
 * ② 메뉴의 하위 화면(상세·등록)일 때 마지막 한 단계로만 쓴다. 메뉴 이름은 운영 중 바뀔 수 있으므로 원천은 늘 서버 트리다.
 */
export function DynamicBreadcrumb({ customItems = [], currentLabel }: { customItems?: BreadcrumbItem[]; currentLabel?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<BreadcrumbItem[]>([]);
  // 메뉴 트리에서 찾은 경로가 현재 화면 자체(정확 일치)인지, 그 상위 메뉴인지.
  const [exactMatch, setExactMatch] = useState(false);

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
        const lastHref = path.at(-1)?.href;
        const lastPath = lastHref ? new URL(lastHref, 'https://egov.invalid').pathname.replace(/\/+$/, '') || '/' : null;
        const currentPath = (pathname || '').replace(/\/+$/, '') || '/';

        setItems(path);
        setExactMatch(lastPath === currentPath);
      } catch {
        setItems([]);
      }
    };

    fetchPath();
  }, [pathname, searchParams]);

  // 하위 화면의 마지막 한 단계 — 화면 제목이 있으면 그것을, 없으면 화면이 넘긴 경로의 마지막 항목을 쓴다.
  const lastStep = currentLabel ? { name: currentLabel } : customItems.at(-1);
  const resolved = items.length === 0
    ? customItems
    : exactMatch || !lastStep || lastStep.name === items.at(-1)?.name
      ? items
      : [...items, { name: lastStep.name }];
  const finalItems = resolved.map(item => ({
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
