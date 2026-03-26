import { UserService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';

export interface DeptJob {
 deptJobId: string;
 deptJobNm: string;
 deptJobCn: string;
 deptJobSe: string; // 1:주요업무, 2:일반업무
 deptId: string;
 deptNm?: string;
 chargerId: string;
 chargerNm?: string;
 priort: string; // 1:긴급, 2:보통, 3:여유
 sttus: string; // 1:진행중, 2:완료
 frstRegisterId: string;
 createdDate: string;
}

/**
 * 부서 업무 관리 서비스 (User)
 */
class DeptJobUserService extends UserService {
 constructor() {
 super('/deptjob');
 }

 /**
 * 부서업무 목록 조회
 */
 async getDeptJobs(params: { page?: number; size?: number; searchWrd?: string }, config?: AxiosRequestConfig): Promise<PageResponse<DeptJob>> {
 return this.get<PageResponse<DeptJob>>('', { ...config, params });
 }

 /**
 * 부서업무 상세 조회
 */
 async getDeptJob(id: string, config?: AxiosRequestConfig): Promise<DeptJob> {
 return this.get<DeptJob>(`/${id}`, config);
 }

 /**
 * 부서업무 등록/수정
 */
 async saveDeptJob(data: Partial<DeptJob>, config?: AxiosRequestConfig): Promise<void> {
 if (data.deptJobId) {
 return this.put<void>(`/${data.deptJobId}`, data, config);
 }
 return this.post<void>('', data, config);
 }

 /**
 * 상태 변경 (완료 처리 등)
 */
 async updateStatus(id: string, sttus: string, config?: AxiosRequestConfig): Promise<void> {
 return this.patch<void>(`/${id}/status`, { sttus }, config);
 }
}

export const deptJobUserService = new DeptJobUserService();
