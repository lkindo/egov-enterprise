import client from '@/lib/api/client';
import { KnoManagementVO, KnoSearchParams } from '@/types/dam';

const damService = {
    /**
     * 지식정보 목록 조회
     */
    getKnoList: async (params: KnoSearchParams, config?: any) => {
        const response: any = await client.get('/dam/mgm/kno', { ...config, params });
        return {
            list: response.list || [],
            pagination: response.pagination || {}
        };
    },

    /**
     * 지식정보 상세 조회
     */
    getKnoDetail: async (knoId: string, config?: any) => {
        const response: any = await client.get(`/dam/mgm/kno/${knoId}`, config);
        return response.board || response.data || response;
    },

    // 지식정보 등록
    createKno: async (data: KnoManagementVO) => {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                formData.append(key, value as string);
            }
        });
        const response = await client.post('/dam/mgm/EgovComDamManagementRegist.do', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response;
    },

    // 지식정보 수정
    updateKno: async (data: KnoManagementVO) => {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                formData.append(key, value as string);
            }
        });
        const response = await client.post('/dam/mgm/EgovComDamManagementModify.do', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response;
    },

    // 지식정보 삭제
    deleteKno: async (knoId: string) => {
        const response = await client.post(`/dam/mgm/EgovComDamManagementDelete.do?knoId=${knoId}`);
        return response;
    }
};

export default damService;
