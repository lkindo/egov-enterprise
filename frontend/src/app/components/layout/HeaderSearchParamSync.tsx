'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { MenuInfo } from '@/types/foundation/menu';

interface HeaderSearchParamSyncProps {
  menus: MenuInfo[];
  activeMenuNo: number | null;
  setActiveMenuNo: (no: number) => void;
}

export function HeaderSearchParamSync({
  menus,
  activeMenuNo,
  setActiveMenuNo
}: HeaderSearchParamSyncProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchBbsId = searchParams?.get('bbsId');

  useEffect(() => {
    if (menus.length === 0) return;

    const currentPath = pathname;
    
    const matchTopMenu = () => {
      if (searchBbsId) {
        for (const m of menus) {
          const hasBbsMatch = m.children?.some(c => {
            if (String(c.modernRoute || '').includes(`bbsId=${searchBbsId}`)) return true;
            return c.children?.some(cc => String(cc.modernRoute || '').includes(`bbsId=${searchBbsId}`));
          });
          if (hasBbsMatch || String(m.modernRoute || '').includes(`bbsId=${searchBbsId}`)) {
            return m.menuNo;
          }
        }
      }

      let bestMatch = { menuNo: null as number | null, score: 0 };

      const calculateScore = (route?: string) => {
        if (!route) return 0;
        const pureRoute = route.split('?')[0];
        if (currentPath === pureRoute) return 10000;
        if (currentPath.startsWith(pureRoute + '/') || (pureRoute !== '/' && currentPath === pureRoute)) {
          return pureRoute.length;
        }
        return 0;
      };

      for (const m of menus) {
        let menuMaxScore = calculateScore(m.modernRoute);
        m.children?.forEach(c => {
          menuMaxScore = Math.max(menuMaxScore, calculateScore(c.modernRoute));
          c.children?.forEach(cc => {
            menuMaxScore = Math.max(menuMaxScore, calculateScore(cc.modernRoute));
          });
        });

        if (menuMaxScore > bestMatch.score) {
          bestMatch = { menuNo: m.menuNo, score: menuMaxScore };
        }
      }

      return bestMatch.menuNo;
    };

    const matchedNo = matchTopMenu();
    if (matchedNo && matchedNo !== activeMenuNo) {
      setActiveMenuNo(matchedNo);
    }
  }, [pathname, searchBbsId, menus, activeMenuNo, setActiveMenuNo]);

  return null;
}
