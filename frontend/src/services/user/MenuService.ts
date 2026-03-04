import { ApiService } from '@/services/core/ApiService';
import { MenuInfo } from '@/types/menu';

class MenuService extends ApiService {
    constructor() {
        super('/menu');
    }

    /**
     * GNB(Head) 메뉴 목록 조회
     */
    async getHeadMenus(config?: any): Promise<MenuInfo[]> {
        const response: any = await this.get('/head', config);
        return response.list || [];
    }

    /**
     * LNB(Left) 메뉴 목록 조회 - 상위 메뉴 번호 기준
     */
    async getLeftMenus(menuNo: number, config?: any): Promise<MenuInfo[]> {
        const response: any = await this.get(`/left?menuNo=${menuNo}`, config);
        return response.list || [];
    }
}

export const menuService = new MenuService();