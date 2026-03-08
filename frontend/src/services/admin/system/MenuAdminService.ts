import { AdminService } from '@/services/core/ApiService';
import { MenuManage, SearchParams } from '@/types/system';

/**
 * 메뉴 관리 서비스 (Admin)
 */
class MenuAdminService extends AdminService {
    constructor() {
        super('/menus');
    }

    /** 메뉴 목록 조회 (페이징) */
    async getMenuList(params?: SearchParams, config?: any) {
        const response = await this.get<any>('', { ...config, params });
        return response?.result;
    }

    /** 메뉴 전체 트리 조회용 목록 */
    async getAllMenus(config?: any) {
        const response = await this.get<any>('/all', config);
        return response?.result;
    }

    /** 메뉴 상세 조회 */
    async getMenu(menuNo: number | string, config?: any) {
        const response = await this.get<any>(`/${menuNo}`, config);
        return response?.result;
    }

    /** 메뉴 등록 */
    async createMenu(data: Partial<MenuManage>, config?: any) {
        const response = await this.post<any>('', data, config);
        return response?.result;
    }

    /** 메뉴 정보 수정 */
    async updateMenu(menuNo: number | string, data: Partial<MenuManage>, config?: any) {
        const response = await this.put<any>(`/${menuNo}`, data, config);
        return response?.result;
    }

    /** 메뉴 삭제 */
    async deleteMenu(menuNo: number | string, config?: any) {
        const response = await this.delete<any>(`/${menuNo}`, config);
        return response?.result;
    }

    /** 메뉴 순서 일괄 변경 */
    async updateMenuOrder(menuList: Partial<MenuManage>[], config?: any) {
        const response = await this.put<any>('/batch-order', menuList, config);
        return response?.result;
    }
}

export const menuAdminService = new MenuAdminService();
