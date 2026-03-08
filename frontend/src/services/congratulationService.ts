import client from '@/lib/api/client';

/**
 * 野껋럩????온????뺥돩??(Admin)
 * 獄쏄퉮肉?? com.company.project.api.controller.system.CongratulationManageController
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
    /** 野껋럩???筌뤴뫖以?鈺곌퀬??(??륁뵠筌? */
    getCongratulations: async (params?: { searchWrd?: string; page?: number; size?: number }, ..._args: any[]) => {
        return client.get<any>(BASE_URL, { params });
    },

    /** 野껋럩????怨멸쉭 鈺곌퀬??*/
    getCongratulation: async (congratulationId: string, ..._args: any[]) => {
        return client.get<CongratulationInfo>(`${BASE_URL}/${congratulationId}`);
    },

    /** 野껋럩???筌욊낯???源낆쨯 */
    createCtsnn: async (data: Partial<CongratulationInfo>, ..._args: any[]) => {
        return client.post<string>(BASE_URL, data);
    },

    /** 野껋럩????類ｋ궖 ??륁젟 */
    updateCtsnn: async (congratulationId: string, data: Partial<CongratulationInfo>, ..._args: any[]) => {
        return client.put<void>(`${BASE_URL}/${congratulationId}`, data);
    },

    /** 野껋럩?????곷열 ????*/
    deleteCtsnn: async (congratulationId: string, ..._args: any[]) => {
        return client.delete<void>(`${BASE_URL}/${congratulationId}`);
    },

    /** 野껋럩????諭??筌ｌ꼶??*/
    approveCtsnn: async (congratulationId: string, params?: { confmAt: "Y" | "N"; returnResn?: string }, ..._args: any[]) => {
        const p = params || { confmAt: "Y" as const };
        return client.put<void>(`${BASE_URL}/${congratulationId}/approval`, null, { params: p });
    },
};
