import { AdminService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/system';

/**
 * 부서 정보 DTO
 */
export interface DeptDto {
 orgnztId?: string;
 orgnztNm: string;
 orgnztDc: string;
}

class DeptAdminService extends AdminService {
 constructor() {
 super('/depts');
 }

 /** 부서 목록 페이징 조회 */
 async getDeptList(params?: { keyword?: string; page?: number; size?: number }, config?: any) {
 return this.get<PageResponse<DeptDto>>('', { ...config, params });
 }

 /** 부서 상세 조회 */
 async getDept(deptId: string, config?: any) {
 return this.get<DeptDto>(`/${deptId}`, config);
 }

 /** 부서 등록 */
 async createDept(dto: DeptDto, config?: any) {
 return this.post<void>('', dto, config);
 }

 /** 부서 수정 */
 async updateDept(deptId: string, dto: DeptDto, config?: any) {
 return this.put<void>(`/${deptId}`, dto, config);
 }

 /** 부서 삭제 */
 async deleteDept(deptId: string, config?: any) {
 return this.delete<void>(`/${deptId}`, config);
 }
}

export const deptAdminService = new DeptAdminService();
