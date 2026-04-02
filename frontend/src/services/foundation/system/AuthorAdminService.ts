import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import { MenuByAuthority } from '@/types/foundation/security';

export interface AuthorInfo {
  authorCode: string;
  authorNm: string;
  authorDc?: string;
  authorCreatDe?: string;
}

/**
 * 沅뚰븳 洹몃９ 관리님쒕퉬님(Admin)
 */
class AuthorAdminService extends AdminService {
  constructor() {
    super('/authorities');
  }

  /** 沅뚰븳 洹몃９ 紐⑸줉 조회 */
  async getAuthorList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<AuthorInfo>> {
    const finalParams = { ...params };
    if (params?.page !== undefined) finalParams.pageIndex = params.page + 1;
    if (params?.page踰덊샇 !== undefined) finalParams.pageIndex = params.page踰덊샇;
    
    return this.get<PageResponse<AuthorInfo>>('', { ...config, params: finalParams });
  }

  /** 沅뚰븳 洹몃９ 상세 조회 */
  async getAuthor(authorCode: string, config?: AxiosRequestConfig): Promise<AuthorInfo> {
    return this.get<AuthorInfo>(`/${authorCode}`, config);
  }

  /** 沅뚰븳 洹몃９ 등록 */
  async createAuthor(data: Partial<AuthorInfo>, config?: AxiosRequestConfig): Promise<void> {
    return this.post<void>('', data, config);
  }

  /** 沅뚰븳 洹몃９ ?섏젙 */
  async updateAuthor(authorCode: string, data: Partial<AuthorInfo>, config?: AxiosRequestConfig): Promise<void> {
    return this.put<void>(`/${authorCode}`, data, config);
  }

  /** 沅뚰븳 洹몃９ 님젣 */
  async deleteAuthor(authorCode: string, config?: AxiosRequestConfig): Promise<void> {
    return this.delete<void>(`/${authorCode}`, config);
  }

  /** 沅뚰븳 洹몃９ ㅼ쨷 님젣 */
  async deleteAuthors(authorCodes: string[], config?: AxiosRequestConfig): Promise<void> {
    return this.delete<void>('', { ...config, data: authorCodes });
  }

  /** 沅뚰븳蹂硫붾돱 紐⑸줉 조회 */
  async getAuthorMenus(authorCode: string, config?: AxiosRequestConfig): Promise<MenuByAuthority[]> {
    return this.get<MenuByAuthority[]>(`/${authorCode}/menus`, config);
  }
}

export const authorAdminService = new AuthorAdminService();
