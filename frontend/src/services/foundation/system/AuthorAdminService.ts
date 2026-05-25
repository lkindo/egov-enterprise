import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import { MenuByAuthority } from '@/types/foundation/security';

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
}

export const authorAdminService = new AuthorAdminService();
