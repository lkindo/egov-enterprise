'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import { browserQueryClient, subscribeBrowserQueryClient } from '@/lib/query/browser-query-client';
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
  // [2026-10-26] 조회 조건은 값으로 비교한다. 객체로 비교하면 렌더마다 새 객체를 주는 호출자(시험 대역 등)에서 메뉴 조회가 끝없이
  //   다시 돌았다 — 같은 주소면 다시 읽지 않는다.
  const searchKey = searchParams?.toString() ?? '';
  const [items, setItems] = useState<BreadcrumbItem[]>([]);
  // 메뉴 트리에서 찾은 경로가 현재 화면 자체(정확 일치)인지, 그 상위 메뉴인지.
  const [exactMatch, setExactMatch] = useState(false);

  // [2026-11-25 품질 평가] 머리글·사이드바가 쓰는 메뉴 조회 캐시를 함께 쓴다 — 종전에는 주소가 바뀔 때마다 따로 읽었다. 그 조회의 키에는
  //   사용자·인가 버전이 들어가므로 키를 다시 만들지 않고, 지금 켜져 있는(관찰자가 있는) 머리글 메뉴 조회를 찾아 그 키로 읽는다. 없으면
  //   (로그인 전·공급자 없는 렌더) 종전처럼 직접 읽는다. 늦게 도착한 이전 주소의 응답은 버린다 — 빠르게 옮기면 이전 경로가 덮어썼다.
  //   클라이언트는 컨텍스트가 아니라 앱 공급자가 기억한 것을 읽는다(react-query 를 대역으로 바꾼 화면 시험이 그대로 돌게).
  //   클라이언트는 공급자가 기억한 것을 구독한다 — 첫 마운트에서는 자식(브레드크럼) 효과가 공급자 효과보다 먼저 돌아 아직 없을 수 있다.
  const queryClient = useSyncExternalStore(subscribeBrowserQueryClient, browserQueryClient, () => undefined);

  useEffect(() => {
    let cancelled = false;
    // 같은 효과 안에서도 가장 나중의 계산만 반영한다 — 느린 직접 조회가 그 뒤의 캐시 갱신을 옛 이름으로 덮지 않게(Codex 2차 검토).
    let latest = 0;
    const applyMenus = (menus: unknown) => {
      if (!Array.isArray(menus)) {
        setItems([]);
        return;
      }
      const path: BreadcrumbItem[] = [];
      const match = findActiveMenu(menus, pathname || '', new URLSearchParams(searchKey));
      for (const menu of match?.path ?? []) {
        path.push({ name: menu.menuNm, href: resolveMenuInternalRoute(menu) ?? undefined });
      }
      const lastHref = path.at(-1)?.href;
      const lastPath = lastHref ? new URL(lastHref, 'https://egov.invalid').pathname.replace(/\/+$/, '') || '/' : null;
      const currentPath = (pathname || '').replace(/\/+$/, '') || '/';
      setItems(path);
      setExactMatch(lastPath === currentPath);
    };
    const loadMenus = () => {
      const shared = queryClient?.getQueryCache().findAll({ queryKey: ['menus', 'head'], type: 'active' })
        .sort((left, right) => right.state.dataUpdatedAt - left.state.dataUpdatedAt)[0];
      return queryClient && shared
        ? queryClient.fetchQuery({
          queryKey: shared.queryKey,
          queryFn: () => menuService.getHeadMenus(),
          staleTime: 5 * 60 * 1000,
        })
        : menuService.getHeadMenus();
    };
    const fetchPath = async () => {
      const mine = ++latest;
      try {
        const menus = await loadMenus() || [];
        if (!cancelled && mine === latest) applyMenus(menus);
      } catch {
        if (!cancelled && mine === latest) setItems([]);
      }
    };

    void fetchPath();
    // 같은 주소에서 사용자·인가 버전이 바뀌면 머리글 메뉴 조회가 새 값으로 바뀐다 — 그 캐시 값으로 경로를 다시 계산한다(Codex 검토: 종전에는
    //   이전 메뉴 이름·링크가 남았다). 진행 중인 직접 조회는 이 계산보다 오래됐으므로 버린다.
    const unsubscribe = queryClient?.getQueryCache().subscribe((event) => {
      const key = event.query.queryKey;
      if (key[0] !== 'menus' || key[1] !== 'head') return;
      if (event.type === 'updated' && event.action.type === 'success' && event.query.isActive()) {
        latest += 1;
        if (!cancelled) applyMenus(event.query.state.data);
      }
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [pathname, searchKey, queryClient]);

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
