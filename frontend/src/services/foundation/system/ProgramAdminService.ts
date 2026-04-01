import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';

import { Program } from '@/types/foundation/program';

/**
 * ?꾨줈洹몃옩 愿由님쒕퉬님(Admin)
 */
class ProgramAdminService extends AdminService {
 constructor() {
 super('/programs');
 }

 /** ?꾨줈洹몃옩 紐⑸줉 조회 */
 async getProgramList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<Program>> {
 return this.get<PageResponse<Program>>('', {
 ...config,
 params: {
 ...params,
 searchWrd: params?.searchKeyword || params?.searchWrd || '',
 },
 });
 }

 /** ?꾨줈洹몃옩 ?곸꽭 조회 */
 async getProgram(progrmFileNm: string, config?: AxiosRequestConfig): Promise<Program> {
 return this.get<Program>(`/${progrmFileNm}`, config);
 }

 /** ?꾨줈洹몃옩 등록 */
 async createProgram(data: Partial<Program>, config?: AxiosRequestConfig): Promise<void> {
 return this.post('', data, config);
 }

 /** ?꾨줈洹몃옩 ?섏젙 */
 async updateProgram(progrmFileNm: string, data: Partial<Program>, config?: AxiosRequestConfig): Promise<void> {
 return this.put(`/${progrmFileNm}`, data, config);
 }

 /** ?꾨줈洹몃옩 님젣 */
 async deleteProgram(progrmFileNm: string, config?: AxiosRequestConfig): Promise<void> {
 return this.delete(`/${progrmFileNm}`, config);
 }
}

export const programAdminService = new ProgramAdminService();
