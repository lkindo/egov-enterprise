import { AdminService } from '@/services/core/ApiService';
import { AxiosRequestConfig } from 'axios';

export interface MyPageContent {
 cntntsId: string;
 cntntsNm: string;
 cntcUrl: string;
 cntntsUseYn: 'Y' | 'N';
 cntntsLinkUrl: string;
 cntntsDc: string;
}

/**
 * 留덉씠페이지€ 肄섑뀗痢관리님쒕퉬님(Admin)
 */
class MyPageAdminService extends AdminService {
 constructor() {
 super('/workspace/mypage/contents');
 }

 /** 留덉씠페이지 肄섑뀗痢목록 조회 */
 async getContents(params?: { all?: boolean }, config?: AxiosRequestConfig): Promise<MyPageContent[]> {
 return this.get<MyPageContent[]>('', { ...config, params });
 }

 /** 留덉씠페이지 肄섑뀗痢등록 */
 async createContent(data: Partial<MyPageContent>, config?: AxiosRequestConfig): Promise<string> {
 return this.post<string>('', data, config);
 }

 /** 留덉씠페이지 肄섑뀗痢님섏젙 */
 async updateContent(id: string, data: Partial<MyPageContent>, config?: AxiosRequestConfig): Promise<void> {
 return this.put<void>(`/${id}`, data, config);
 }

 /** 留덉씠페이지 肄섑뀗痢님삭제 */
 async deleteContent(id: string, config?: AxiosRequestConfig): Promise<void> {
 return this.delete<void>(`/${id}`, config);
 }
}

export const myPageAdminService = new MyPageAdminService();
