import { AdminService } from '@/services/core/ApiService';
import { PaginationResponse, SearchParams, MenuManage } from '@/types/system';

class MenuAdminService extends AdminService {
    constructor() {
        super('/menus');
    }

    /**
     * 메뉴 목록 조회
     */
    async getMenuList(params: SearchParams, config?: any): Promise<PaginationResponse<MenuManage>> {
        return this.get<PaginationResponse<MenuManage>>('', { ...config, params });
    }

    /**
     * 전체 메뉴 목록 조회 (페이징 없이 트리용)
     */
    async getAllMenus(config?: any): Promise<MenuManage[]> {
        return this.get<MenuManage[]>('/all', config);
    }

    /**
     * 메뉴 상세 조회
     */
    async getMenu(menuNo: number, config?: any): Promise<MenuManage> {
        return this.get<MenuManage>(`/${menuNo}`, config);
    }

    /**
     * 메뉴 등록
     */
    async createMenu(menu: MenuManage, config?: any): Promise<void> {
        return this.post('', menu, config);
    }

    /**
     * 메뉴 수정
     */
    async updateMenu(id: number | string, data: Partial<MenuManage>, config?: any): Promise<void> {
        return this.put(`/${id}`, data, config);
    }

    /**
     * 메뉴 삭제
     */
    async deleteMenu(menuNo: number, config?: any): Promise<void> {
        return this.delete(`/${menuNo}`, config);
    }

    /**
     * 메뉴 생성 목록 조회
     */
    async getMenuCreatList(params: SearchParams, config?: any): Promise<any> {
        return this.get('/creation', { ...config, params });
    }

    /**
     * 메뉴 생성 등록
     */
    async createMenuCreat(menuCreat: any, config?: any): Promise<void> {
        return this.post('/creation', menuCreat, config);
    }

    // legacy helpers or batch operations
    async updateOrders(menus: any[], config?: any) {
        return this.put('/batch-order', menus, config);
    }
}

export const menuAdminService = new MenuAdminService();
