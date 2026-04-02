import { UserService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';

export interface DeptJob {
 deptJobId: string;
 deptJobNm: string;
 deptJobCn: string;
 deptJobSe: string; // 1:二쇱슂업무, 2:?쇰컲업무
 deptId: string;
 deptNm?: string;
 chargerId: string;
 chargerNm?: string;
 priort: string; // 1:湲닿툒, 2:蹂댄넻, 3:ъ쑀
 sttus: string; // 1:吏꾪뻾以 2:완료
 frstRegisterId: string;
 createdDate: string;
}

/**
 * 遺님업무 관리님쒕퉬님(User)
 */
class DeptJobUserService extends UserService {
 constructor() {
 super('/deptjob');
 }

 /**
 * 遺쒖뾽臾紐⑸줉 조회
 */
 async getDeptJobs(params: { page?: number; size?: number; searchWrd?: string }, config?: AxiosRequestConfig): Promise<PageResponse<DeptJob>> {
 return this.get<PageResponse<DeptJob>>('', { ...config, params });
 }

 /**
 * 遺쒖뾽臾님곸꽭 조회
 */
 async getDeptJob(id: string, config?: AxiosRequestConfig): Promise<DeptJob> {
 return this.get<DeptJob>(`/${id}`, config);
 }

 /**
 * 遺쒖뾽臾등록/?섏젙
 */
 async saveDeptJob(data: Partial<DeptJob>, config?: AxiosRequestConfig): Promise<void> {
 if (data.deptJobId) {
 return this.put<void>(`/${data.deptJobId}`, data, config);
 }
 return this.post<void>('', data, config);
 }

 /**
 * ?곹깭 蹂寃(완료 泥섎━ 님
 */
 async updateStatus(id: string, sttus: string, config?: AxiosRequestConfig): Promise<void> {
 return this.patch<void>(`/${id}/status`, { sttus }, config);
 }
}

export const deptJobUserService = new DeptJobUserService();
