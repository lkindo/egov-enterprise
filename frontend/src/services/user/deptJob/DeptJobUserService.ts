import { UserService } from '@/services/core/ApiService';

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

class DeptJobUserService extends UserService {
    constructor() {
        super('/deptjob');
    }

    /**
     * 부서업무 목록 조회
     */
    async getDeptJobs(params: { page?: number; size?: number; searchWrd?: string }) {
        return this.get<any>('', { params });
    }

    /**
     * 부서업무 상세 조회
     */
    async getDeptJob(id: string) {
        return this.get<any>(`/${id}`);
    }

    /**
     * 부서업무 등록/수정
     */
    async saveDeptJob(data: Partial<DeptJob>) {
        if (data.deptJobId) {
            return this.put<any>(`/${data.deptJobId}`, data);
        }
        return this.post<any>('', data);
    }

    /**
     * 상태 변경 (완료 처리 등)
     */
    async updateStatus(id: string, sttus: string) {
        return this.patch<any>(`/${id}/status`, { sttus });
    }
}

export const deptJobUserService = new DeptJobUserService();
