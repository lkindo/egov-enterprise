import { z } from 'zod';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import type { AxiosRequestConfig } from 'axios';
import type { components, operations } from '@/types/generated-api';
import { MenuStructureItemResponseSchema, MenuStructureResponseSchema } from '@/types/generated-zod';
import {
  createMenuCreationOperation,
  createMenuOperation,
  getAllMenusOperation,
  getMenuCreationManageListOperation,
  getMenuListOperation,
  getMenuOperation,
  getMenuStructureOperation,
  type GeneratedOperationRequest,
  saveMenuStructureOperation,
} from '@/types/generated-operations';

export interface Menu {
  menuNo: number;
  menuNm: string;
  upMenuSn: number;
  menuOrdr: number;
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

/**
 * [2026-10-02 D1·D2] 메뉴 구조 한 줄(GET /menus/structure). 캐시를 거치지 않은 DB 기준이고, 사용 안 함 메뉴도 들어 있다.
 *
 * 받은 값을 초안 기준선으로 바로 쓸 수 있게 두 가지를 맞춘다.
 * - 라우트 없음은 서버가 null 또는 '' 로 줄 수 있다(서버 보고 §5) — 둘 다 null 로 맞춘다. 그대로 두면 기준선 ''
 *   와 초안 null 이 '속성 변경' 으로 잡힌다. 저장할 때 비우면 서버가 '' 로 둔다.
 * - 최상위의 상위는 null 이다(서버가 0 을 null 로 바꿔 보낸다 — 0 이 오면 같은 뜻으로 null 로 맞춘다).
 * 사용 여부는 사이드바와 같은 판정('Y' 만 사용)으로 'Y' | 'N' 으로 맞춘다.
 */
export const menuStructureItemSchema = MenuStructureItemResponseSchema.extend({
  upMenuSn: MenuStructureItemResponseSchema.shape.upMenuSn.transform((value) => (value === 0 ? null : value)),
  modernRoute: MenuStructureItemResponseSchema.shape.modernRoute.transform((value) => (value === '' ? null : value)),
  useYn: MenuStructureItemResponseSchema.shape.useYn.transform((value): 'Y' | 'N' => (value === 'Y' ? 'Y' : 'N')),
});
/**
 * 메뉴 구조 전체와 그 버전(메뉴 전체 행의 요약값). 저장할 때 version 을 그대로 돌려보낸다 — 그 사이 어떤 메뉴든
 * 바뀌었으면 서버가 409 로 거부한다. 메뉴 번호가 겹치는 응답은 기준선으로 쓰지 않는다.
 */
export const menuStructureSchema = MenuStructureResponseSchema.extend({
  version: MenuStructureResponseSchema.shape.version.min(1),
  menus: z.array(menuStructureItemSchema)
    .refine((menus) => new Set(menus.map((menu) => menu.menuNo)).size === menus.length),
});
export type MenuStructure = z.infer<typeof menuStructureSchema>;
export type MenuStructureItem = z.infer<typeof menuStructureItemSchema>;
/** 저장 요청(PUT /menus/structure). 바뀐 부모의 형제 전체 1..n, 바뀐 기존 메뉴의 속성 네 칸 전체, 삭제, 그룹별 메뉴 표시 변경. */
export type MenuStructureSave = GeneratedOperationRequest<'saveMenuStructure'>;
export type MenuCreation = MenuStructureSave['creations'][number];
export type MenuPlacement = MenuStructureSave['placements'][number];
export type MenuProperties = MenuStructureSave['properties'][number];
export type MenuGroupGrantChange = MenuStructureSave['grants'][number];

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
    menuExpln,
    upMenuSn,
    upperMenuId,
    children,
    ...rest
  } = source;

  return {
    ...rest,
    ...(menuExpln !== undefined ? { menuExpln } : {}),
    ...(upMenuSn == null ? {} : { upMenuSn }),
    ...(upperMenuId == null ? {} : { upperMenuId }),
    ...(children === undefined ? {} : { children: children.map(toMenuRequest) }),
  } as MenuWire;
}

/**
 * 메뉴 관리 서비스 (Admin)
 */
class MenuAdminService extends AdminService {
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

  /**
   * [2026-10-02 D1·D2] 메뉴 구조와 버전(MENU_READ). 사이드바·메뉴 목록과 달리 캐시를 거치지 않는다 — 초안의 기준선이다.
   */
  async getMenuStructure(config?: AxiosRequestConfig): Promise<MenuStructure> {
    return menuStructureSchema.parse(await this.executeGenerated(getMenuStructureOperation, { config }));
  }

  /**
   * [2026-10-02 D1·D2] 메뉴 구조와 그 메뉴의 그룹별 메뉴 표시를 한 번에 저장한다. 저장 뒤 구조(새 버전)를 돌려준다 — 새
   * 기준선으로 쓴다. 권한: MENU_UPDATE 항상, 새 메뉴가 있으면 MENU_CREATE, 삭제가 있으면 MENU_DELETE, 그룹 배정 변경이
   * 있으면 AUTHRT_GRANT.
   *
   * 빈 버전·빈 그룹 버전·바뀐 것이 없는 요청은 전송 전에(동기로) 막는다. 409(구조·그룹 버전, 그룹 삭제)와
   * 400(깊이·순환·삭제 뒤 남는 하위·숨김 검사 등)은 서버 문구 그대로 거부된다.
   */
  saveMenuStructure(body: MenuStructureSave, config?: AxiosRequestConfig): Promise<MenuStructure> {
    if (!body.version) throw new Error('메뉴 구조를 다시 불러온 뒤 저장해 주세요.');
    if (body.grants.some((grant) => !grant.groupVersion)) throw new Error('그룹 권한을 다시 불러온 뒤 저장해 주세요.');
    if (body.creations.length + body.placements.length + body.properties.length + body.deletions.length + body.grants.length === 0) {
      throw new Error('바뀐 내용이 없습니다.');
    }
    // 메뉴 전체를 잠그고 그룹 권한까지 한 트랜잭션에서 고치므로 기존 일괄 순서 저장과 같은 시간 한도를 둔다.
    return this.executeGenerated(saveMenuStructureOperation, { body, config: { ...config, timeout: 120000 } })
      .then((value) => menuStructureSchema.parse(value));
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

  /*
   * [2026-10-02 D2] 메뉴 한 건 수정·순서 일괄 수정·삭제 메서드는 걷었다 — 메뉴 화면은 구조·속성·그룹 표시를 한 초안으로
   * saveMenuStructure 한 번에 저장한다. 서버 API(updateMenu·updateMenuOrder·deleteMenu)는 남아 있고 operation 원장에
   * 대체된 표면으로 적혀 있다(DEC-OPS-208).
   */

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
