import client from '@/lib/api/client';
import { KnoManagementVO, KnoSearchParams } from '@/types/business/dam';
import { AxiosRequestConfig } from 'axios';

const BASE_URL = '/admin/digital-assets';

export const getKnoList = async (params: any = {}, config?: AxiosRequestConfig) => {
 const response = await client.get<any>(BASE_URL, { ...config, params });
 return {
 list: response.result?.content || [],
 pagination: {
 totalCount: response.result?.totalElements || 0,
 totalPages: response.result?.totalPages || 0
 }
 };
};

export const getKnoDetail = async (knoId: string, config?: AxiosRequestConfig) => {
 const response = await client.get<any>(`${BASE_URL}/${knoId}`, config);
 return response.result;
};

export const createKno = async (data: any, config?: AxiosRequestConfig) =>
 client.post(BASE_URL, data, config);

export const updateKno = async (knoId: string, data: any, config?: AxiosRequestConfig) =>
 client.put(`${BASE_URL}/${knoId}`, data, config);

export const deleteKno = async (knoId: string, config?: AxiosRequestConfig) =>
 client.delete(`${BASE_URL}/${knoId}`, config);
