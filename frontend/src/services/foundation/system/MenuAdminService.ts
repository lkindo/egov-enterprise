import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import type { AxiosRequestConfig } from 'axios';
import type { components, operations } from '@/types/generated-api';
import {
  createMenuCreationOperation,
  createMenuOperation,
  deleteMenuOperation,
  getAllMenusOperation,
  getMenuCreationManageListOperation,
  getMenuListOperation,
  getMenuOperation,
  type GeneratedOperationRequest,
  updateMenuOperation,
  updateMenuOrderOperation,
} from '@/types/generated-operations';

export interface Menu {
  menuNo: number;
  menuNm: string;
  prgrmFileNm: string;
  upMenuSn: number;
  menuOrdr: number;
  menuDc: string;
  menuExpln?: string;
  relImgPath: string;
  relImgNm: string;
  modernRoute?: string;
  useYn?: string;
}

interface MenuCreate {
  authrtCd: string;
  menuSn: number;
  crtrId: string;
}

type MenuSearchQuery = NonNullable<operations['getMenuList']['parameters']['query']>;
type MenuWire = components['schemas']['MenuDto'];

const MENU_QUERY_KEYS = [
  'searchCondition',
  'searchKeyword',
  'searchUseYn',
  'pageIndex',
  'pageUnit',
  'pageSize',
  'firstIndex',
  'lastIndex',
  'recordCountPerPage',
  'searchKeywordFrom',
  'searchKeywordTo',
] as const satisfies readonly (keyof MenuSearchQuery)[];

function toMenuSearchQuery(params?: SearchParams): MenuSearchQuery {
  const query: MenuSearchQuery = {};
  if (!params) return { searchKeyword: '' };

  const generatedParams = params as Partial<MenuSearchQuery>;
  for (const key of MENU_QUERY_KEYS) {
    const value = generatedParams[key];
    if (value !== undefined) Object.assign(query, { [key]: value });
  }

  query.searchKeyword = params.searchKeyword || params.searchWrd || '';
  if (params.pageIndex === undefined) {
    if (params.page !== undefined) query.pageIndex = params.page + 1;
    else if (params.pageNo !== undefined) query.pageIndex = params.pageNo;
  }
  if (params.pageUnit === undefined && params.size !== undefined) query.pageUnit = params.size;
  if (params.recordCountPerPage === undefined && params.size !== undefined) {
    query.recordCountPerPage = params.size;
  }
  if (params.pageUnit === undefined && params.size === undefined && generatedParams.pageSize !== undefined) {
    query.pageUnit = generatedParams.pageSize;
  }
  return query;
}

function requireMenuPage<T>(
  response: { list?: T[]; total?: number; page?: number; size?: number; totalPage?: number },
): PageResponse<T> {
  if (
    !Array.isArray(response.list)
    || typeof response.total !== 'number'
    || typeof response.page !== 'number'
    || typeof response.size !== 'number'
    || typeof response.totalPage !== 'number'
  ) {
    throw new Error('메뉴 페이지 응답이 필수 계약과 일치하지 않습니다.');
  }
  return response as PageResponse<T>;
}

function toMenuRequest(data: Partial<Menu>): MenuWire {
  const source = data as Partial<MenuWire> & Partial<Menu> & {
    children?: Partial<Menu>[];
    upperMenuId?: number | null;
    upMenuSn?: number | null;
  };
  const {
    menuDc,
    menuExpln,
    upMenuSn,
    upperMenuId,
    children,
    ...rest
  } = source;

  return {
    ...rest,
    ...(menuExpln !== undefined ? { menuExpln } : menuDc !== undefined ? { menuExpln: menuDc } : {}),
    ...(upMenuSn == null ? {} : { upMenuSn }),
    ...(upperMenuId == null ? {} : { upperMenuId }),
    ...(children === undefined ? {} : { children: children.map(toMenuRequest) }),
  } as MenuWire;
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
    const response = await this.executeGenerated(getMenuListOperation, {
      query: toMenuSearchQuery(params),
      config,
    });
    return requireMenuPage(response) as PageResponse<Menu>;
  }

  /** 메뉴 전체 트리 조회 */
  async getAllMenus(config?: AxiosRequestConfig): Promise<Menu[]> {
    return this.executeGenerated(getAllMenusOperation, { config }) as Promise<Menu[]>;
  }

  /** 메뉴 상세 조회 */
  async getMenu(menuNo: number, config?: AxiosRequestConfig): Promise<Menu> {
    return this.executeGenerated(getMenuOperation, { path: { menuNo }, config }) as Promise<Menu>;
  }

  /** 메뉴 등록 */
  async createMenu(data: Partial<Menu>, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(createMenuOperation, {
      body: toMenuRequest(data) as GeneratedOperationRequest<'createMenu'>,
      config,
    });
  }

  /** 메뉴 수정 */
  async updateMenu(menuNo: number, data: Partial<Menu>, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(updateMenuOperation, {
      path: { menuNo },
      body: toMenuRequest(data) as GeneratedOperationRequest<'updateMenu'>,
      config,
    });
  }

  /** 메뉴 순서 일괄 수정 - API 명세에 따른 경로 수정 (/batch-order) */
  async updateMenuOrder(data: Partial<Menu>[], config?: AxiosRequestConfig): Promise<void> {
    // 다량의 메뉴 업데이트 부하를 고려하여 타임아웃 120초로 연장
    return this.executeGenerated(updateMenuOrderOperation, {
      body: data.map(toMenuRequest) as GeneratedOperationRequest<'updateMenuOrder'>,
      config: { ...config, timeout: 120000 },
    });
  }

  /** 메뉴 삭제 */
  async deleteMenu(menuNo: number, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(deleteMenuOperation, { path: { menuNo }, config });
  }

  /** 권한별 메뉴 생성 관리 목록 조회 */
  async getMenuCreationManageList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<MenuCreate>> {
    const response = await this.executeGenerated(getMenuCreationManageListOperation, {
      query: toMenuSearchQuery(params),
      config,
    });
    return requireMenuPage(response) as PageResponse<MenuCreate>;
  }

  /** 권한별 메뉴 할당 저장 */
  async saveMenuCreation(authorCode: string, menuNos: number[], config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(createMenuCreationOperation, {
      path: { authorCode },
      body: menuNos,
      config,
    });
  }
}

export const menuAdminService = new MenuAdminService();
