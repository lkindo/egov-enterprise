import { AdminService } from '@/services/core/ApiService';
import { AxiosRequestConfig } from 'axios';

export interface MyPageContent {
 cntntsId: string;
 cntntsNm: string;
 cntcUrl: string;
 cntntsUseAt: 'Y' | 'N';
 cntntsLinkUrl: string;
 cntntsDc: string;
}

/**
 * 마이페이지 콘텐츠 관리 서비스 (Admin)
 */
class MyPageAdminService extends AdminService {
 constructor() {
 super('/workspace/mypage/contents');
 }

 /** 마이페이지 콘텐츠 목록 조회 */
 async getContents(params?: { all?: boolean }, config?: AxiosRequestConfig): Promise<MyPageContent[]> {
 return this.get<MyPageContent[]>('', { ...config, params });
 }

 /** 마이페이지 콘텐츠 등록 */
 async createContent(data: Partial<MyPageContent>, config?: AxiosRequestConfig): Promise<string> {
 return this.post<string>('', data, config);
 }

 /** 마이페이지 콘텐츠 수정 */
 async updateContent(id: string, data: Partial<MyPageContent>, config?: AxiosRequestConfig): Promise<void> {
 return this.put<void>(`/${id}`, data, config);
 }

 /** 마이페이지 콘텐츠 삭제 */
 async deleteContent(id: string, config?: AxiosRequestConfig): Promise<void> {
 return this.delete<void>(`/${id}`, config);
 }
}

export const myPageAdminService = new MyPageAdminService();
