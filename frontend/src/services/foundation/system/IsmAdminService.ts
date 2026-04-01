import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';

export interface InfrmlSanctn {
 infrmlSanctnId: string;
 jobSe?: string;
 jobSeCode: string;
 applcntId: string;
 confmrerId?: string;
 sanctnerId?: string;
 confmAt: 'Y' | 'N' | 'R' | 'A';
 sancltNm: string;
 returnResn?: string;
 reqstDe?: string;
 frstRegisterId?: string;
 lastUpdusrId?: string;
}

/**
 * ?꾩궛 ?좎껌(Informal Sanction) 愿由님쒕퉬님(Admin)
 */
class IsmAdminService extends AdminService {
 constructor() {
 super('/ism'); // /api/v1/admin/system/ism
 }

 /** ?좎껌 紐⑸줉 조회 */
 async getInfrmlSanctnList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<InfrmlSanctn>> {
 return this.get<PageResponse<InfrmlSanctn>>('', { ...config, params });
 }

 /** ?좎껌 ?곸꽭 조회 */
 async getInfrmlSanctn(id: string, config?: AxiosRequestConfig): Promise<InfrmlSanctn> {
 return this.get<InfrmlSanctn>(`/${id}`, config);
 }

 /** ?좎껌 등록 */
 async createInfrmlSanctn(data: Partial<InfrmlSanctn>, config?: AxiosRequestConfig): Promise<InfrmlSanctn> {
 return this.post<InfrmlSanctn>('', data, config);
 }

 /** ?좎껌 ?섏젙 */
 async updateInfrmlSanctn(id: string, data: Partial<InfrmlSanctn>, config?: AxiosRequestConfig): Promise<void> {
 return this.put(`/${id}`, data, config);
 }

 /** ?좎껌 ?뱀씤/諛섎젮 */
 async confirmInfrmlSanctn(id: string, confmAt: string, returnResn?: string, config?: AxiosRequestConfig): Promise<void> {
 return this.patch(`/${id}/confirm`, null, { ...config, params: { confmAt, returnResn } });
 }

 /** ?좎껌 님젣 */
 async deleteInfrmlSanctn(id: string, config?: AxiosRequestConfig): Promise<void> {
 return this.delete(`/${id}`, config);
 }
}

export const ismAdminService = new IsmAdminService();
