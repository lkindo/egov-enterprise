import client from '@/lib/api/client';
import { PaginationResponse, SearchParams, MenuManage } from '@/types/system';

export const getMenuList = async (params: SearchParams): Promise<PaginationResponse<MenuManage>> =>
    client.get<PaginationResponse<MenuManage>>('/sym/mnu/mpm/EgovMenuListSelect.do', { params });

export const getMenu = async (menuNo: number): Promise<MenuManage> =>
    client.get<MenuManage>(`/sym/mnu/mpm/EgovMenuDetailSelect.do?menuNo=${menuNo}`);

export const createMenu = async (menu: MenuManage): Promise<void> =>
    client.post('/sym/mnu/mpm/EgovMenuRegist.do', menu);

export const updateMenu = async (menu: MenuManage): Promise<void> =>
    client.put('/sym/mnu/mpm/EgovMenuDetailSelectUpdt.do', menu);

export const deleteMenu = async (menuNo: number): Promise<void> =>
    client.delete(`/sym/mnu/mpm/EgovMenuManageDelete.do?menuNo=${menuNo}`);

export const getMenuCreatList = async (params: SearchParams): Promise<unknown> =>
    client.get('/sym/mnu/mcm/EgovMenuCreatManageSelect.do', { params });

export const createMenuCreat = async (menuCreat: unknown): Promise<void> =>
    client.post('/sym/mnu/mcm/EgovMenuCreatInsert.do', menuCreat);
