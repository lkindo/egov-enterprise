'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import type { MenuInfo } from '@/types/foundation/menu';
import { findActiveMenu } from '@/lib/navigation/active-menu';

interface HeaderSearchParamSyncProps {
  menus: MenuInfo[];
  activeMenuNo: number | null;
  setActiveMenuNo: (no: number) => void;
}

export function HeaderSearchParamSync({ menus, activeMenuNo, setActiveMenuNo }: HeaderSearchParamSyncProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const previousLocation = useRef<{ pathname: string; query: string; menus: MenuInfo[] } | null>(null);

  useEffect(() => {
    const previous = previousLocation.current;
    const selectionExists = menus.some((menu) => menu.menuNo === activeMenuNo);
    // 사용자가 다른 영역의 메뉴를 펼쳐 보는 선택은 같은 URL에서 즉시 되돌리지 않는다.
    if (selectionExists && previous?.pathname === pathname && previous.query === query && previous.menus === menus) return;
    previousLocation.current = { pathname, query, menus };
    const matchedNo = findActiveMenu(menus, pathname, new URLSearchParams(query))?.topMenuNo;
    const nextMenuNo = matchedNo ?? (selectionExists ? activeMenuNo : menus[0]?.menuNo) ?? 0;
    if (nextMenuNo !== activeMenuNo) setActiveMenuNo(nextMenuNo);
  }, [pathname, query, menus, activeMenuNo, setActiveMenuNo]);

  return null;
}
