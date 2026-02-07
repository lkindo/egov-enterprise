import client from '@/lib/api/client';
import { KnoManagementVO, KnoSearchParams } from '@/types/dam';

const damService = {
    // 지식정보 목록 조회
    getKnoList: async (params: KnoSearchParams) => {
        const response = await client.get('/dam/mgm/EgovComDamManagementList.do', { params });
        return {
            success: true,
            list: response.data.resultList as KnoManagementVO[],
            pagination: response.data.paginationInfo
        };
    },

    // 지식정보 상세 조회
    getKnoDetail: async (knoId: string) => {
        const response = await client.get(`/dam/mgm/EgovComDamManagement.do?knoId=${knoId}`);
        return {
            success: true,
            data: response.data.result as KnoManagementVO
        };
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
        return response.data;
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
        return response.data;
    },

    // 지식정보 삭제
    deleteKno: async (knoId: string) => {
        const response = await client.post(`/dam/mgm/EgovComDamManagementDelete.do?knoId=${knoId}`);
        return response.data;
    }
};

export default damService;
