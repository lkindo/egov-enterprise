import client from '@/lib/api/client';

export interface CommonCodeDetail {
    codeId: string;
    code: string;
    codeNm: string;
    codeDc: string;
    useAt: 'Y' | 'N';
}

export const codeService = {
    /**
     * 코드 그룹 목록 조회
     */
    getGroups: async (params: { searchWrd?: string } = {}, config?: any): Promise<any[]> => {
        return client.get<any[]>('/admin/system/codes', { ...config, params });
    },

    /**
     * 상세 코드 목록 조회
     */
    getDetails: async (params: { codeId: string; searchWrd?: string }, config?: any): Promise<CommonCodeDetail[]> => {
        return client.get<CommonCodeDetail[]>(`/admin/system/codes/${params.codeId}/details`, { ...config, params });
    },

    /**
     * 상세 코드 저장 (등록/수정)
     */
    saveDetail: async (data: Partial<CommonCodeDetail>, config?: any): Promise<void> => {
        return client.post('/admin/system/codes/details', data, config);
    },

    /**
     * 상세 코드 삭제
     */
    deleteDetail: async (codeId: string, code: string, config?: any): Promise<void> => {
        return client.delete(`/admin/system/codes/${codeId}/details/${code}`, config);
    },
};
