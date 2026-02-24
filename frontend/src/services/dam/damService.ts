import client from '@/lib/api/client';
import { KnoManagementVO, KnoSearchParams } from '@/types/dam';

const damService = {
    // 吏?앹젙蹂?紐⑸줉 議고쉶
    getKnoList: async (params: KnoSearchParams) => {
        const response = await client.get('/dam/mgm/EgovComDamManagementList.do', { params });
        return {
            success: true,
            list: response.data.resultList as KnoManagementVO[],
            pagination: response.data.paginationInfo
        };
    },

    // 吏?앹젙蹂??곸꽭 議고쉶
    getKnoDetail: async (knoId: string) => {
        const response = await client.get(`/dam/mgm/EgovComDamManagement.do?knoId=${knoId}`);
        return {
            success: true,
            data: response.data.result as KnoManagementVO
        };
    },

    // 吏?앹젙蹂??깅줉
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

    // 吏?앹젙蹂??섏젙
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

    // 吏?앹젙蹂???젣
    deleteKno: async (knoId: string) => {
        const response = await client.post(`/dam/mgm/EgovComDamManagementDelete.do?knoId=${knoId}`);
        return response;
    }
};

export default damService;

