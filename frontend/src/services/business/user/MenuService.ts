import { AxiosRequestConfig } from 'axios';
import { ApiService } from '@/services/core/ApiService';
import { MenuInfo } from '@/types/foundation/menu';

class MenuService extends ApiService {
  constructor() {
    super('/menus');
  }

  /**
   * GNB(Head) 메뉴 목록 조회
   */
  async getHeadMenus(config?: AxiosRequestConfig): Promise<MenuInfo[]> {
    try {
      const res = await this.get<{ list: MenuInfo[] }>('/head', config);
      return res?.list || [];
    } catch {
      console.warn('Failed to fetch head menus:', error);
      return [];
    }
  }

  /**
   * LNB(Left) 메뉴 목록 조회 - 상위 메뉴 번호 기준
   */
  async getLeftMenus(menuNo: number, config?: AxiosRequestConfig): Promise<MenuInfo[]> {
    try {
      const res = await this.get<{ list: MenuInfo[] }>(`/left?menuNo=${menuNo}`, config);
      return res?.list || [];
    } catch {
      console.warn('Failed to fetch left menus:', error);
      return [];
    }
  }
}

export const menuService = new MenuService();
