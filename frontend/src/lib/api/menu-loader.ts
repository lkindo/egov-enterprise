import { cache } from 'react';
import { menuService } from '@/services/business/user/MenuService';
;

export const getInitialMenus = cache(async (accessToken?: string) => {
  if (!accessToken) return [];

  const axiosConfig = { headers: { Authorization: `Bearer ${accessToken}` } };

  try {
    const headList = await menuService.getHeadMenus(axiosConfig);
    return await Promise.all(
      headList.map(async (menu) => {
        try {
          const leftList = await menuService.getLeftMenus(menu.menuNo, axiosConfig);
          return { ...menu, children: leftList };
        } catch {
          // 하위 메뉴 조회 한 건이 실패해도 머리 메뉴가 이미 준 하위를 지우지 않는다 — 빈 하위로 덮으면 브레드크럼·사이드바가 그 경로를
          //   잃는다(2026-11-25 Codex 검토).
          return { ...menu, children: menu.children ?? [] };
        }
      })
    );
  } catch {
    return [];
  }
});
