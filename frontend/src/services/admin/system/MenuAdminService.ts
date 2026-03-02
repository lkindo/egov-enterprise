import client from '@/lib/api/client';
import { MenuManage, SearchParams, PaginationResponse } from '@/types/system';

/**
 * 메뉴 관리 서비스 (Admin)
 * 백엔드: com.company.project.api.controller.system.MenuAdminController
 */
const BASE_URL = '/admin/system/menus';

export const menuAdminService = {
    /** 메뉴 목록 조회 (페이징) */
    getMenuList: async (params?: SearchParams, _config?: any) => {
        return client.get<PaginationResponse<MenuManage>>(BASE_URL, { params });
    },

    /** 메뉴 전체 트리 조회용 목록 */
    getAllMenus: async (_config?: any) => {
        return client.get<MenuManage[]>(`${BASE_URL}/all`);
    },

    /** 메뉴 상세 조회 */
    getMenu: async (menuNo: number | string, _config?: any) => {
        return client.get<MenuManage>(`${BASE_URL}/${menuNo}`);
    },

    /** 메뉴 등록 */
    createMenu: async (data: Partial<MenuManage>, _config?: any) => {
        return client.post<void>(BASE_URL, data);
    },

    /** 메뉴 정보 수정 */
    updateMenu: async (menuNo: number | string, data: Partial<MenuManage>, _config?: any) => {
        return client.put<void>(`${BASE_URL}/${menuNo}`, data);
    },

    /** 메뉴 삭제 */
    deleteMenu: async (menuNo: number | string, _config?: any) => {
        return client.delete<void>(`${BASE_URL}/${menuNo}`);
    },

    /** 메뉴 순서 일괄 변경 */
    updateMenuOrder: async (menuList: Partial<MenuManage>[], _config?: any) => {
        return client.put<void>(`${BASE_URL}/batch-order`, menuList);
    },

    /** 메뉴 순서 일괄 변경 (Alias) */
    updateOrders: async (menuList: Partial<MenuManage>[], _config?: any) => {
        return client.put<void>(`${BASE_URL}/batch-order`, menuList);
    },
};
