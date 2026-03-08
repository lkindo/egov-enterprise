import { UserService } from '@/services/core/ApiService';

export interface DeptJob {
    deptJobId: string;
    deptJobNm: string;
    deptJobCn: string;
    deptJobSe: string; // 1:??곗뺘, 2:餓λ쵐??
    deptId: string;
    deptNm?: string;
    chargerId: string;
    chargerNm?: string;
    priort: string; // 1:?誘れ벉, 2:癰귣똾?? 3:????
    sttus: string; // 1:筌욊쑵六얌빳? 2:?袁⑥┷
    frstRegisterId: string;
    createdDate: string;
}

class DeptJobUserService extends UserService {
    constructor() {
        super('/deptjob');
    }

    /**
     * ?봔??뽯씜??筌뤴뫖以?鈺곌퀬??
     */
    async getDeptJobs(params: { page?: number; size?: number; searchWrd?: string }) {
        return this.get<any>('', { params });
    }

    /**
     * ?봔??뽯씜???怨멸쉭 鈺곌퀬??
     */
    async getDeptJob(id: string) {
        return this.get<any>(`/${id}`);
    }

    /**
     * ?봔??뽯씜???源낆쨯/??륁젟
     */
    async saveDeptJob(data: Partial<DeptJob>) {
        if (data.deptJobId) {
            return this.put<any>(`/${data.deptJobId}`, data);
        }
        return this.post<any>('', data);
    }

    /**
     * ?怨밴묶 癰궰野?(?袁⑥┷ 筌ｌ꼶????
     */
    async updateStatus(id: string, sttus: string) {
        return this.patch<any>(`/${id}/status`, { sttus });
    }
}

export const deptJobUserService = new DeptJobUserService();
