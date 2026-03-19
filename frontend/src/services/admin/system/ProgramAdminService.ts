import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/system';
import { AxiosRequestConfig } from 'axios';

import { Program } from '@/types/program';

/**
 * 프로그램 관리 서비스 (Admin)
 */
class ProgramAdminService extends AdminService {
 constructor() {
 super('/programs');
 }

 /** 프로그램 목록 조회 */
 async getProgramList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<Program>> {
 return this.get<PageResponse<Program>>('', {
 ...config,
 params: {
 ...params,
 searchWrd: params?.searchKeyword || params?.searchWrd || '',
 },
 });
 }

 /** 프로그램 상세 조회 */
 async getProgram(progrmFileNm: string, config?: AxiosRequestConfig): Promise<Program> {
 return this.get<Program>(`/${progrmFileNm}`, config);
 }

 /** 프로그램 등록 */
 async createProgram(data: Partial<Program>, config?: AxiosRequestConfig): Promise<void> {
 return this.post('', data, config);
 }

 /** 프로그램 수정 */
 async updateProgram(progrmFileNm: string, data: Partial<Program>, config?: AxiosRequestConfig): Promise<void> {
 return this.put(`/${progrmFileNm}`, data, config);
 }

 /** 프로그램 삭제 */
 async deleteProgram(progrmFileNm: string, config?: AxiosRequestConfig): Promise<void> {
 return this.delete(`/${progrmFileNm}`, config);
 }
}

export const programAdminService = new ProgramAdminService();
