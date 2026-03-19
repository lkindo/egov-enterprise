import { ApiService } from '@/services/core/ApiService';
import { MenuInfo } from '@/types/menu';

class MenuService extends ApiService {
 constructor() {
 super('/menus');
 }

 /**
 * GNB(Head) 메뉴 목록 조회
 */
 async getHeadMenus(config?: any): Promise<MenuInfo[]> {
 const res = await this.get<any>('/head', config);
 return res?.list || [];
 }

 /**
 * LNB(Left) 메뉴 목록 조회 - 상위 메뉴 번호 기준
 */
 async getLeftMenus(menuNo: number, config?: any): Promise<MenuInfo[]> {
 const res = await this.get<any>(`/left?menuNo=${menuNo}`, config);
 return res?.list || [];
 }
}

export const menuService = new MenuService();
