import client from '@/lib/api/client';
import { PaginationResponse, SearchParams, MenuManage } from '@/types/system';

export const getMenuList = async (params: SearchParams) => {
    const { data } = await client.get<PaginationResponse<MenuManage>>('/sym/mnu/mpm/EgovMenuListSelect.do', { params });
    return data;
};

export const getMenu = async (menuNo: number) => {
    const { data } = await client.get<MenuManage>(`/sym/mnu/mpm/EgovMenuDetailSelect.do?menuNo=${menuNo}`);
    return data;
};

export const createMenu = async (menu: MenuManage) => {
    return client.post('/sym/mnu/mpm/EgovMenuRegist.do', menu);
};

export const updateMenu = async (menu: MenuManage) => {
    return client.put('/sym/mnu/mpm/EgovMenuDetailSelectUpdt.do', menu);
};

export const deleteMenu = async (menuNo: number) => {
    return client.delete(`/sym/mnu/mpm/EgovMenuManageDelete.do?menuNo=${menuNo}`);
};

export const getMenuCreatList = async (params: SearchParams) => {
    return client.get('/sym/mnu/mcm/EgovMenuCreatManageSelect.do', { params });
}

export const createMenuCreat = async (menuCreat: any) => {
    return client.post('/sym/mnu/mcm/EgovMenuCreatInsert.do', menuCreat);
}

