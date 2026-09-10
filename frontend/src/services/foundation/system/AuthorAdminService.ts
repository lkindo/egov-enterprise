import { AxiosRequestConfig } from 'axios';
import type { components, operations } from '@/types/generated-api';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import {
  getAuthorMenusOperation,
  getAuthorsOperation,
} from '@/types/generated-operations';
/**
 * 권한별 메뉴 할당 여부 응답 1건 — 서버 `MenuCreateDto` 의 실제 모양이다.
 *
 * ⚠ 이름 필드가 `authrtNm`(권한명)이지만 서버가 여기에 담는 것은 **메뉴명**이다
 * (MenuService.selectMenuCreatList 가 proj.getMenuNm() 을 authrtNm 으로 매핑한다).
 * 계층 정보(upperMenuSn)는 projection 에는 있으나 DTO 로 옮겨지지 않아 응답에 없다.
 */
export type AuthorMenuAssignment = components['schemas']['MenuCreateDto'];

/** 롤 한 건 + 이 권한에 할당됐는지(regYn). 생성 계약을 그대로 쓴다. */
export type AuthorRoleProjection = components['schemas']['AuthorRoleProjection'];

export type AuthorInfo = components['schemas']['AuthorManageDto'];
type AuthorListQuery = NonNullable<operations['getAuthors']['parameters']['query']>;

const AUTHOR_QUERY_KEYS = [
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
] as const satisfies readonly (keyof AuthorListQuery)[];

function toAuthorListQuery(params?: SearchParams): AuthorListQuery {
  const query: AuthorListQuery = {};
  if (!params) return query;

  const generatedParams = params as Partial<AuthorListQuery>;
  for (const key of AUTHOR_QUERY_KEYS) {
    const value = generatedParams[key];
    if (value !== undefined) Object.assign(query, { [key]: value });
  }

  if (params.page !== undefined) query.pageIndex = params.page + 1;
  if (params.pageNo !== undefined) query.pageIndex = params.pageNo;
  if (params.pageUnit === undefined && params.size !== undefined) query.pageUnit = params.size;
  if (params.recordCountPerPage === undefined && params.size !== undefined) {
    query.recordCountPerPage = params.size;
  }
  if (params.pageUnit === undefined && params.size === undefined && generatedParams.pageSize !== undefined) {
    query.pageUnit = generatedParams.pageSize;
  }
  return query;
}

function requireAuthorPage<T>(
  response: { list?: T[]; total?: number; page?: number; size?: number; totalPage?: number },
): PageResponse<T> {
  if (
    !Array.isArray(response.list)
    || typeof response.total !== 'number'
    || typeof response.page !== 'number'
    || typeof response.size !== 'number'
    || typeof response.totalPage !== 'number'
  ) {
    throw new Error('권한 페이지 응답이 필수 계약과 일치하지 않습니다.');
  }
  return response as PageResponse<T>;
}

/**
 * 권한 그룹 관리 서비스 (Admin)
 */
class AuthorAdminService extends AdminService {
  constructor() {
    super('/authorities');
  }

  /** 권한 그룹 목록 조회 */
  async getAuthorList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<AuthorInfo>> {
    const response = await this.executeGenerated(getAuthorsOperation, {
      query: toAuthorListQuery(params),
      config,
    });
    return requireAuthorPage(response);
  }

  /**
   * 권한별 메뉴 할당 여부 조회.
   *
   * ⚠ [2026-08-29 타입 정정] 반환 타입이 `MenuByAuthority[]`(menuNo·menuNm·upperMenuId·
   * menuOrdr·prgrmFileNm)로 선언돼 있었는데 **서버가 주는 것은 그 모양이 아니다.**
   * 실제 응답은 `MenuCreateDto`(menuSn·authrtCd·authrtNm·chkYeoBu 등)이고 menuNo 도
   * upperMenuId 도 없다. 잘못된 선언 때문에 소비자가 존재하지 않는 필드를 읽어도 tsc 가
   * 잡지 못했고, 권한별 메뉴 화면의 트리가 **모든 권한에서 영구히 비어 있었다**.
   *
   * 서버는 `from(menu).leftJoin(menuAuthority)` 로 **전체 메뉴**에 할당 여부를 붙여 내려준다
   * (MenuAuthorityRepositoryImpl). 즉 이 응답은 "할당된 메뉴 목록" 이 아니라
   * "메뉴 전체 + 할당 플래그" 다 — 할당분만 쓰려면 `chkYeoBu === 1` 로 걸러야 한다.
   * 메뉴 이름·계층은 여기 없으므로 `MenuAdminService.getAllMenus()` 와 합쳐 써야 한다.
   */
  async getAuthorMenus(authorCode: string, config?: AxiosRequestConfig): Promise<AuthorMenuAssignment[]> {
    return this.executeGenerated(getAuthorMenusOperation, {
      path: { authrtCd: authorCode },
      config,
    });
  }
}

export const authorAdminService = new AuthorAdminService();
