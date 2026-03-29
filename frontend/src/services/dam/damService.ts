import client from '@/lib/api/client';
import { KnoManagementVO, KnoSearchParams } from '@/types/business/dam';
import { AxiosRequestConfig } from 'axios';

const BASE_URL = '/admin/digital-assets';

export interface KnoListResponse {
  list: KnoManagementVO[];
  pagination: {
    totalCount: number;
    totalPages: number;
  };
}

export const getKnoList = async (params: KnoSearchParams = {}, config?: AxiosRequestConfig): Promise<KnoListResponse> => {
  const response = await client.get<{ result: { content: KnoManagementVO[]; totalElements: number; totalPages: number } }>(BASE_URL, { ...config, params });
  return {
    list: response.result?.content || [],
    pagination: {
      totalCount: response.result?.totalElements || 0,
      totalPages: response.result?.totalPages || 0
    }
  };
};

export const getKnoDetail = async (knoId: string, config?: AxiosRequestConfig): Promise<KnoManagementVO> => {
  const response = await client.get<{ result: KnoManagementVO }>(`${BASE_URL}/${knoId}`, config);
  return response.result;
};

export const createKno = async (data: Partial<KnoManagementVO>, config?: AxiosRequestConfig) =>
  client.post(BASE_URL, data, config);

export const updateKno = async (knoId: string, data: Partial<KnoManagementVO>, config?: AxiosRequestConfig) =>
  client.put(`${BASE_URL}/${knoId}`, data, config);

export const deleteKno = async (knoId: string, config?: AxiosRequestConfig) =>
  client.delete(`${BASE_URL}/${knoId}`, config);
