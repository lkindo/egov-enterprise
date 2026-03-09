import { ApiService } from '@/services/core/ApiService';
import { MenuInfo } from '@/types/menu';

class MenuService extends ApiService {
    constructor() {
        super('/menu');
    }

    /**
     * GNB(Head) 筌롫뗀??筌뤴뫖以?鈺곌퀬??
     */
    async getHeadMenus(config?: any): Promise<MenuInfo[]> {
        const response: any = await this.get('/head', config);
        // Robust fallback for various data structures
        return response?.result?.list || response?.result || response?.list || (Array.isArray(response) ? response : []);
    }

    /**
     * LNB(Left) 筌롫뗀??筌뤴뫖以?鈺곌퀬??- ?怨몄맄 筌롫뗀??甕곕뜇??疫꿸퀣?
     */
    async getLeftMenus(menuNo: number, config?: any): Promise<MenuInfo[]> {
        const response: any = await this.get(`/left?menuNo=${menuNo}`, config);
        return response?.result?.list || response?.result || response?.list || (Array.isArray(response) ? response : []);
    }
}

export const menuService = new MenuService();
