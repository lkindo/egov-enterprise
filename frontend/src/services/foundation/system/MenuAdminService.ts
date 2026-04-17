import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';

export interface Menu {
  menuNo: number;
  menuNm: string;
  progrmFileNm: string;
  upperMenuNo: number;
  menuOrdr: number;
  menuDc: string;
  relateImagePath: string;
  relateImageNm: string;
  modernRoute?: string;
}

export interface MenuCreate {
  authorCode: string;
  menuNo: number;
  creatPersonId: string;
}

/**
 * 메뉴 관리 서비스 (Admin)
 */
class MenuAdminService extends AdminService {
  constructor() {
    super('/menus');
  }

  /** 메뉴 목록 조회 */
  async getMenuList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<Menu>> {
    return this.get<PageResponse<Menu>>('', {
      ...config,
      params: {
        ...params,
        searchWrd: params?.searchKeyword || params?.searchWrd || '',
      },
    });
  }

  /** 메뉴 전체 트리 조회 */
  async getAllMenus(config?: AxiosRequestConfig): Promise<Menu[]> {
    return this.get<Menu[]>('/all', config);
  }

  /** 메뉴 상세 조회 */
  async getMenu(menuNo: number, config?: AxiosRequestConfig): Promise<Menu> {
    return this.get<Menu>(`/${menuNo}`, config);
  }

  /** 메뉴 등록 */
  async createMenu(data: Partial<Menu>, config?: AxiosRequestConfig): Promise<void> {
    return this.post('', data, config);
  }

  /** 메뉴 수정 */
  async updateMenu(menuNo: number, data: Partial<Menu>, config?: AxiosRequestConfig): Promise<void> {
    return this.put(`/${menuNo}`, data, config);
  }

  /** 메뉴 순서 일괄 수정 - API 명세에 따른 경로 수정 (/batch-order) */
  async updateMenuOrder(data: Partial<Menu>[], config?: AxiosRequestConfig): Promise<void> {
    // 다량의 메뉴 업데이트 부하를 고려하여 타임아웃 120초로 연장
    return this.put('/batch-order', data, { ...config, timeout: 120000 });
  }

  /** 메뉴 삭제 */
  async deleteMenu(menuNo: number, config?: AxiosRequestConfig): Promise<void> {
    return this.delete(`/${menuNo}`, config);
  }

  /** 권한별 메뉴 생성 관리 목록 조회 */
  async getMenuCreationManageList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<MenuCreate>> {
    return this.get<PageResponse<MenuCreate>>('/creation-manage', {
      ...config,
      params: {
        ...params,
        searchWrd: params?.searchKeyword || params?.searchWrd || '',
      },
    });
  }

  /** 권한별 메뉴 할당 저장 */
  async saveMenuCreation(authorCode: string, menuNos: number[], config?: AxiosRequestConfig): Promise<void> {
    return this.post(`/creation/${authorCode}`, menuNos, config);
  }
}

export const menuAdminService = new MenuAdminService();
