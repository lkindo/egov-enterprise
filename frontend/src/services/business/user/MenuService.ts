import { AxiosRequestConfig } from 'axios';
import { ApiService } from '@/services/core/ApiService';
import { MenuInfo } from '@/types/foundation/menu';
import { getHeadMenuOperation, getLeftMenuOperation } from '@/types/generated-operations';

class MenuService extends ApiService {
  constructor() {
    super('/menus');
  }

  /**
   * GNB(Head) 메뉴 목록 조회
   */
  async getHeadMenus(config?: AxiosRequestConfig): Promise<MenuInfo[]> {
    const response = await this.executeGenerated(getHeadMenuOperation, { config });
    return response.list as unknown as MenuInfo[];
  }

  /**
   * LNB(Left) 메뉴 목록 조회 - 상위 메뉴 번호 기준
   */
  async getLeftMenus(menuNo: number, config?: AxiosRequestConfig): Promise<MenuInfo[]> {
    const response = await this.executeGenerated(getLeftMenuOperation, {
      query: { menuNo },
      config,
    });
    return response.list as unknown as MenuInfo[];
  }
}

export const menuService = new MenuService();
