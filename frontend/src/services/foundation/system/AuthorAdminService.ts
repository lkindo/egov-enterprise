import { AxiosRequestConfig } from 'axios';
import type { components } from '@/types/generated-api';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
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

export interface AuthorInfo {
  authrtCd: string;
  authrtNm: string;
  authrtExpln?: string;
  authrtCrtYmd?: string;
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
    const finalParams = { ...params };
    
    // Standardize page parameter
    if (params?.page !== undefined) {
      finalParams.pageIndex = params.page + 1;
    }
    
    if (params?.pageNo !== undefined) {
      finalParams.pageIndex = params.pageNo;
    }
    
    return this.get<PageResponse<AuthorInfo>>('', { ...config, params: finalParams });
  }

  /** 권한 그룹 상세 조회 */
  async getAuthor(authorCode: string, config?: AxiosRequestConfig): Promise<AuthorInfo> {
    return this.get<AuthorInfo>(`/${authorCode}`, config);
  }

  /** 권한 그룹 등록 */
  async createAuthor(data: Partial<AuthorInfo>, config?: AxiosRequestConfig): Promise<void> {
    return this.post<void>('', data, config);
  }

  /** 권한 그룹 수정 */
  async updateAuthor(authorCode: string, data: Partial<AuthorInfo>, config?: AxiosRequestConfig): Promise<void> {
    return this.put<void>(`/${authorCode}`, data, config);
  }

  /** 권한 그룹 삭제 */
  async deleteAuthor(authorCode: string, config?: AxiosRequestConfig): Promise<void> {
    return this.delete<void>(`/${authorCode}`, config);
  }

  /** 권한 그룹 다중 삭제 */
  async deleteAuthors(authorCodes: string[], config?: AxiosRequestConfig): Promise<void> {
    return this.delete<void>('', { ...config, data: authorCodes });
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
    return this.get<AuthorMenuAssignment[]>(`/${authorCode}/menus`, config);
  }

  /**
   * 권한별 롤 목록과 할당 여부 조회.
   *
   * 서버는 `tb_role_info`에 left join 으로 할당 여부(`regYn`)를 붙여 페이지 단위로 내려준다.
   * 전체 페이지를 모으면 "이 권한이 가질 수 있는 롤 전체 + 지금 가진 것" 이 된다.
   *
   * ⚠ 호출자는 서버 상한 안에서 **모든 페이지를 끝까지** 받아야 한다. 저장이 전체 교체
   * (`insertAuthorRole` 이 기존 매핑을 전량 삭제한 뒤 재삽입)이므로, 첫 페이지만 보고
   * 저장하면 **보지 못한 페이지의 롤이 전부 지워진다**.
   */
  async getAuthorRoles(
    authorCode: string,
    params?: { pageIndex?: number; pageUnit?: number; searchKeyword?: string },
    config?: AxiosRequestConfig,
  ): Promise<PageResponse<AuthorRoleProjection>> {
    return this.get<PageResponse<AuthorRoleProjection>>(`/${authorCode}/roles`, { ...config, params });
  }

  /**
   * 권한에 할당할 롤을 저장한다.
   *
   * ⚠ **전체 교체다.** 서버가 기존 매핑을 전량 삭제한 뒤 받은 목록으로 다시 만든다.
   * 부분 목록을 보내면 나머지가 조용히 사라진다 — 호출자는 반드시 "지금 선택된 전체 집합" 을
   * 보내야 한다.
   */
  async saveAuthorRoles(authorCode: string, roleCodes: string[], config?: AxiosRequestConfig): Promise<void> {
    return this.post<void>(`/${authorCode}/roles`, roleCodes, config);
  }
}

export const authorAdminService = new AuthorAdminService();
