import client from '@/lib/api/client';
import { PaginationResponse, SearchParams, MenuManage } from '@/types/system';

export const getMenuList = async (params: SearchParams): Promise<PaginationResponse<MenuManage>> => {
    const res = await client.get<PaginationResponse<MenuManage>>('/admin/menus', { params });
    return res;
};

export const getMenu = async (menuNo: number): Promise<MenuManage> =>
    client.get<MenuManage>(`/admin/menus/${menuNo}`);

export const createMenu = async (menu: MenuManage): Promise<void> =>
    client.post('/admin/menus', menu);

export const updateMenu = async (menu: MenuManage): Promise<void> =>
    client.put(`/admin/menus/${menu.menuNo}`, menu);

export const deleteMenu = async (menuNo: number): Promise<void> =>
    client.delete(`/admin/menus/${menuNo}`);

export const getMenuCreatList = async (params: SearchParams): Promise<unknown> =>
    client.get('/admin/menus/creation', { params });

export const createMenuCreat = async (menuCreat: unknown): Promise<void> =>
    client.post('/admin/menus/creation', menuCreat);
