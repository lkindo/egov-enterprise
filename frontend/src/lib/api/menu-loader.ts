import { cache } from 'react';
import { menuService } from '@/services/business/user/MenuService';
import { MenuInfo } from '@/types/foundation/menu';

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
          return { ...menu, children: [] };
        }
      })
    );
  } catch (error) {
    console.error('Failed to pre-fetch menus:', error);
    return [];
  }
});