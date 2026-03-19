import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams, CmmnClCode, CmmnCode, CmmnDetailCode } from '@/types/system';
import { AxiosRequestConfig } from 'axios';

export interface AdministCode {
 administZoneCode: string;
 administZoneNm: string;
 administZoneSe: string;
 upperAdministZoneCode: string;
 useAt: string;
}

export interface InstitutionCode {
 insttCode: string;
 allInsttNm: string;
 lowestInsttNm?: string;
 insttAbrvNm?: string;
 odr?: string;
 ord?: string;
 insttOdr?: string;
 bestInsttCode?: string;
 upperInsttCode?: string;
 reprsntInsttCode?: string;
 insttTyLclas?: string;
 insttTyMclas?: string;
 insttTySclas?: string;
 telno?: string;
 fxnum?: string;
 creatDe?: string;
 ablDe?: string;
 ablEnnc?: string;
}

export interface InstitutionCodeRecptn {
 occrrncDe: string;
 insttCode: string;
 opertSn: number;
 changeSeCode: string;
 processSe: string;
 etcCode: string;
 allInsttNm: string;
 lowestInsttNm: string;
 telno: string;
 fxnum: string;
 creatDe: string;
 ablDe: string;
 ablEnnc: string;
 frstRegistPnttm: string;
 frstRegisterId: string;
}

/**
 * 코드 관리 서비스 (Admin)
 */
class CodeAdminService extends AdminService {
 constructor() {
 super('/codes');
 }

 // --- 분류코드 (Classification Code) ---
 async getClCodeList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<CmmnClCode>> {
 return this.get<PageResponse<CmmnClCode>>('/cl', { ...config, params });
 }

 async getClCode(clCode: string, config?: AxiosRequestConfig): Promise<CmmnClCode> {
 return this.get<CmmnClCode>(`/cl/${clCode}`, config);
 }

 async createClCode(data: Partial<CmmnClCode>, config?: AxiosRequestConfig): Promise<void> {
 return this.post('/cl', data, config);
 }

 async updateClCode(clCode: string, data: Partial<CmmnClCode>, config?: AxiosRequestConfig): Promise<void> {
 return this.put(`/cl/${clCode}`, data, config);
 }

 async deleteClCode(clCode: string, config?: AxiosRequestConfig): Promise<void> {
 return this.delete(`/cl/${clCode}`, config);
 }

 // --- 공통코드 (Common Code) ---
 async getCmmnCodeList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<CmmnCode>> {
 return this.get<PageResponse<CmmnCode>>('/cmmn', { ...config, params });
 }

 async getCmmnCode(codeId: string, config?: AxiosRequestConfig): Promise<CmmnCode> {
 return this.get<CmmnCode>(`/cmmn/${codeId}`, config);
 }

 async createCmmnCode(data: Partial<CmmnCode>, config?: AxiosRequestConfig): Promise<void> {
 return this.post('/cmmn', data, config);
 }

 async updateCmmnCode(codeId: string, data: Partial<CmmnCode>, config?: AxiosRequestConfig): Promise<void> {
 return this.put(`/cmmn/${codeId}`, data, config);
 }

 async deleteCmmnCode(codeId: string, config?: AxiosRequestConfig): Promise<void> {
 return this.delete(`/cmmn/${codeId}`, config);
 }

 // --- 상세코드 (Detail Code) ---
 async getDetailCodeList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<CmmnDetailCode>> {
 return this.get<PageResponse<CmmnDetailCode>>('/detail', { ...config, params });
 }

 async getDetailCode(codeId: string, code: string, config?: AxiosRequestConfig): Promise<CmmnDetailCode> {
 return this.get<CmmnDetailCode>(`/detail/${codeId}/${code}`, config);
 }

 async createDetailCode(data: Partial<CmmnDetailCode>, config?: AxiosRequestConfig): Promise<void> {
 return this.post('/detail', data, config);
 }

 async updateDetailCode(codeId: string, code: string, data: Partial<CmmnDetailCode>, config?: AxiosRequestConfig): Promise<void> {
 return this.put(`/detail/${codeId}/${code}`, data, config);
 }

 async deleteDetailCode(codeId: string, code: string, config?: AxiosRequestConfig): Promise<void> {
 return this.delete(`/detail/${codeId}/${code}`, config);
 }

 // --- 행정코드 (Administrative Code) ---
 async getAdministCodeList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<AdministCode>> {
 return this.get<PageResponse<AdministCode>>('/administ', { ...config, params });
 }

 async getAdministCodeDetail(administZoneCode: string, config?: AxiosRequestConfig): Promise<AdministCode> {
 return this.get<AdministCode>(`/administ/${administZoneCode}`, config);
 }

 async createAdministCode(data: AdministCode, config?: AxiosRequestConfig): Promise<void> {
 return this.post('/administ', data, config);
 }

 async updateAdministCode(administZoneCode: string, data: AdministCode, config?: AxiosRequestConfig): Promise<void> {
 return this.put(`/administ/${administZoneCode}`, data, config);
 }

 async deleteAdministCode(administZoneCode: string, config?: AxiosRequestConfig): Promise<void> {
 return this.delete(`/administ/${administZoneCode}`, config);
 }

 // --- 기관코드 (Institution Code) ---
 async getInstitutionCodeList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<InstitutionCode>> {
 return this.get<PageResponse<InstitutionCode>>('/institution', { ...config, params });
 }

 /** 기관코드 수신 내역 조회 */
 async getInstitutionCodeRecptnList(params?: SearchParams & { processSe?: string }, config?: AxiosRequestConfig): Promise<PageResponse<InstitutionCodeRecptn>> {
 return this.get<PageResponse<InstitutionCodeRecptn>>('/institution/receptions', { ...config, params });
 }

 /** 기관코드 수신 처리 */
 async processInstitutionCodeRecptn(params: { occrrncDe: string, insttCode: string, opertSn: number }, config?: AxiosRequestConfig): Promise<void> {
 return this.post('/institution/receptions/process', null, { ...config, params });
 }
}

export const codeAdminService = new CodeAdminService();
