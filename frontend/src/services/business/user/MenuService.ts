import { AxiosRequestConfig } from 'axios';
import { ApiService } from '@/services/core/ApiService';
import { MenuInfo } from '@/types/foundation/menu';
import {
  addBookmarkOperation,
  cleanupUnavailableBookmarksOperation,
  getHeadMenuOperation,
  getLeftMenuOperation,
  getMyBookmarkStatusOperation,
  getMyBookmarksOperation,
  removeBookmarkOperation,
} from '@/types/generated-operations';
import type { GeneratedOperationRequest } from '@/types/generated-operations';
import type { components } from '@/types/generated-api';

export type MenuBookmarkCleanupRequest = GeneratedOperationRequest<'cleanupUnavailableBookmarks'>;

type MenuDto = components['schemas']['MenuDto'];

/**
 * 생성 메뉴 응답이 화면 메뉴 계약을 지키는가(하위까지). 메뉴 번호는 메뉴 행의 기본키라 늘 오고 화면이 열쇠로 쓴다 — 없으면 계약
 * 위반이다. 사용 여부는 Y·N 이다. 상위 번호는 최상위 메뉴에서 비어 오며 화면 타입도 선택이다.
 */
function isMenuNode(node: MenuDto): node is MenuInfo {
  return typeof node.menuNo === 'number'
    && (node.useYn === undefined || node.useYn === 'Y' || node.useYn === 'N')
    && (node.children ?? []).every(isMenuNode);
}

/** 같은 목록을 화면 메뉴 타입으로 좁힌다(목록 어댑터 — 재포장하지 않는다). 이중 단언 대신 실제 값을 확인한다. */
function requireMenuTree(list: MenuDto[]): MenuInfo[] {
  if (!list.every(isMenuNode)) throw new Error('메뉴 응답이 화면 메뉴 계약과 일치하지 않습니다.');
  return list;
}

class MenuService extends ApiService {
  /**
   * GNB(Head) 메뉴 목록 조회
   */
  async getHeadMenus(config?: AxiosRequestConfig): Promise<MenuInfo[]> {
    const response = await this.executeGenerated(getHeadMenuOperation, { config });
    return requireMenuTree(response.list);
  }

  /**
   * LNB(Left) 메뉴 목록 조회 - 상위 메뉴 번호 기준
   */
  async getLeftMenus(menuNo: number, config?: AxiosRequestConfig): Promise<MenuInfo[]> {
    const response = await this.executeGenerated(getLeftMenuOperation, {
      query: { menuNo },
      config,
    });
    return requireMenuTree(response.list);
  }

  /**
   * 내 메뉴 즐겨찾기(2026-09-26 DIP B5 F2) — 지금 볼 수 있는 메뉴만, 즐겨찾기한 순서로 온다.
   */
  async getMyBookmarks(config?: AxiosRequestConfig) {
    return this.executeGenerated(getMyBookmarksOperation, { config });
  }

  /** 숨겨진 항목은 정보 대신 개수만 받는다. 기존 List API는 명령 센터 등에서 유지한다. */
  async getMyBookmarkStatus(config?: AxiosRequestConfig) {
    return this.executeGenerated(getMyBookmarkStatusOperation, { config });
  }

  /** 본인이 확인한 현재 상태를 보내며, 충돌 뒤 자동으로 다시 삭제하지 않는다. */
  async cleanupUnavailableBookmarks(body: MenuBookmarkCleanupRequest, config?: AxiosRequestConfig) {
    return this.executeGenerated(cleanupUnavailableBookmarksOperation, { body, config });
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
