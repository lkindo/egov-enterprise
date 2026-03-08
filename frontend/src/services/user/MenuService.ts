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
        // 백엔드 데이터 구조: { result: { list: [...] } } 또는 { result: [...] }
        return response?.result?.list || response?.result || [];
    }

    /**
     * LNB(Left) 메뉴 목록 조회 - 상위 메뉴 번호 기준
     */
    async getLeftMenus(menuNo: number, config?: any): Promise<MenuInfo[]> {
        const response: any = await this.get(`/left?menuNo=${menuNo}`, config);
        return response?.result?.list || response?.result || [];
    }
}

export const menuService = new MenuService();
