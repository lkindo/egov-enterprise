import client from '@/lib/api/client';
import { KnoManagementVO, KnoSearchParams } from '@/types/dam';

const BASE_URL = '/api/v1/admin/digital-assets';

export const getKnoList = async (params: any = {}) => {
    const response = await client.get<any>(BASE_URL, { params });
    return {
        list: response.result?.content || [],
        pagination: {
            totalCount: response.result?.totalElements || 0,
            totalPages: response.result?.totalPages || 0
        }
    };
};

export const getKnoDetail = async (knoId: string) => {
    const response = await client.get<any>(`${BASE_URL}/${knoId}`);
    return response.result;
};

export const createKno = async (data: any) =>
    client.post(BASE_URL, data);

export const updateKno = async (knoId: string, data: any) =>
    client.put(`${BASE_URL}/${knoId}`, data);

export const deleteKno = async (knoId: string) =>
    client.delete(`${BASE_URL}/${knoId}`);
