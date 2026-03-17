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
        return this.get<MenuInfo[]>('/head', config);
    }

    /**
     * LNB(Left) 메뉴 목록 조회 - 상위 메뉴 번호 기준
     */
    async getLeftMenus(menuNo: number, config?: any): Promise<MenuInfo[]> {
        return this.get<MenuInfo[]>(`/left?menuNo=${menuNo}`, config);
    }
}

export const menuService = new MenuService();
