import { AxiosRequestConfig } from 'axios';
import { ApiService } from '@/services/core/ApiService';
import { MenuInfo } from '@/types/foundation/menu';
import {
  addBookmarkOperation,
  getHeadMenuOperation,
  getLeftMenuOperation,
  getMyBookmarksOperation,
  removeBookmarkOperation,
} from '@/types/generated-operations';

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

  /**
   * 내 메뉴 즐겨찾기(2026-09-26 DIP B5 F2) — 지금 볼 수 있는 메뉴만, 즐겨찾기한 순서로 온다.
   */
  async getMyBookmarks(config?: AxiosRequestConfig) {
    return this.executeGenerated(getMyBookmarksOperation, { config });
  }

  /** 이미 있으면 그대로 둔다. 볼 수 없는 메뉴는 404, 상한을 넘기면 409 다. */
  async addBookmark(menuNo: number, config?: AxiosRequestConfig): Promise<void> {
    await this.executeGenerated(addBookmarkOperation, { path: { menuNo }, config });
  }

  /** 없으면 아무 일도 하지 않는다. */
  async removeBookmark(menuNo: number, config?: AxiosRequestConfig): Promise<void> {
    await this.executeGenerated(removeBookmarkOperation, { path: { menuNo }, config });
  }
}

export const menuService = new MenuService();
