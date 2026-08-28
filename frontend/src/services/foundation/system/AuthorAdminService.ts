import { AxiosRequestConfig } from 'axios';
import type { components } from '@/types/generated-api';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import { MenuByAuthority } from '@/types/foundation/security';

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

  /** 권한별 메뉴 목록 조회 */
  async getAuthorMenus(authorCode: string, config?: AxiosRequestConfig): Promise<MenuByAuthority[]> {
    return this.get<MenuByAuthority[]>(`/${authorCode}/menus`, config);
  }

  /**
   * 권한별 롤 목록과 할당 여부 조회.
   *
   * 서버는 `tb_role_info` **전량**에 left join 으로 할당 여부(`regYn`)를 붙여 내려준다.
   * 즉 한 번 호출로 "이 권한이 가질 수 있는 롤 전체 + 지금 가진 것" 이 모두 온다.
   *
   * ⚠ `pageUnit` 을 크게 잡아 **한 페이지에 전부** 받아야 한다. 저장이 전체 교체
   * (`insertAuthorRole` 이 기존 매핑을 전량 삭제한 뒤 재삽입)이므로, 한 페이지만 보고
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
