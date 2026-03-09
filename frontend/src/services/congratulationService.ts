import client from '@/lib/api/client';

/**
 * 경조사 관리 서비스 (Admin)
 * 연결: com.company.project.api.controller.system.CongratulationManageController
 */
export interface CongratulationInfo {
    ctsnnId: string;
    usid: string;
    ctsnnCode: string;
    ctsnnNm: string;
    trgetNm: string;
    relate: string;
    occrrncDe: string;
    confmAt: "Y" | "N";
    remark?: string;
}

const BASE_URL = '/admin/system/congratulations';

export const congratulationService = {
    /** 경조사 목록 조회 (페이징) */
    getCongratulations: async (params?: { searchWrd?: string; page?: number; size?: number }, ..._args: any[]) => {
        return client.get<any>(BASE_URL, { params });
    },

    /** 경조사 상세 조회 */
    getCongratulation: async (congratulationId: string, ..._args: any[]) => {
        return client.get<CongratulationInfo>(`${BASE_URL}/${congratulationId}`);
    },

    /** 경조사 신청/등록 */
    createCtsnn: async (data: Partial<CongratulationInfo>, ..._args: any[]) => {
        return client.post<string>(BASE_URL, data);
    },

    /** 경조사 정보 수정 */
    updateCtsnn: async (congratulationId: string, data: Partial<CongratulationInfo>, ..._args: any[]) => {
        return client.put<void>(`${BASE_URL}/${congratulationId}`, data);
    },

    /** 경조사 내역 삭제 */
    deleteCtsnn: async (congratulationId: string, ..._args: any[]) => {
        return client.delete<void>(`${BASE_URL}/${congratulationId}`);
    },

    /** 경조사 승인 처리 */
    approveCtsnn: async (congratulationId: string, params?: { confmAt: "Y" | "N"; returnResn?: string }, ..._args: any[]) => {
        const p = params || { confmAt: "Y" as const };
        return client.put<void>(`${BASE_URL}/${congratulationId}/approval`, null, { params: p });
    },
};
