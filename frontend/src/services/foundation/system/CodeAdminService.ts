import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams, CmmnClCode, CmmnCode, CmmnDetailCode } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';

export interface AdministCode {
    admdstCd: string;
    admdstZoneNm: string;
    admdstSeCd: string;
    upAdmdstCd: string;
    useYn: string;
}

export interface InstitutionCode {
    instCd: string;
    allInstNm: string;
    lwtrkInstNm?: string;
    instAbbrNm?: string;
    odr?: string;
    ord?: string;
    instCycl?: string;
    topInstCd?: string;
    upInstCd?: string;
    rprsInstCd?: string;
    instTypeLclsf?: string;
    instTypeMclsf?: string;
    instTypeSclsf?: string;
    telno?: string;
    faxNo?: string;
    crtYmd?: string;
    ablYmd?: string;
    ablYn?: string;
}

export interface InstitutionCodeRecptn {
    ocrnYmd: string;
    instCd: string;
    jobSn: number;
    chgSeCd: string;
    procSe: string;
    etcCd: string;
    allInstNm: string;
    lwtrkInstNm: string;
    telno: string;
    faxNo: string;
    crtYmd: string;
    ablYmd: string;
    ablYn: string;
    crtDt: string;
    frstRgtrId: string;
}

/** 공통코드 계층 일괄 저장 항목 (백엔드 CmmnCodeHierarchyDto 와 1:1) */
export interface CmmnCodeHierarchyItem {
    /** 이동 대상 코드그룹 ID */
    cdId: string;
    /** 이동 후 소속 분류코드 */
    clsfCd: string;
}

/**
 * 코드 관리 서비스(Admin)
 */
class CodeAdminService extends AdminService {
    constructor() {
        super('/codes');
    }

    // --- 분류코드 (Classification Code) ---
    async getClCodeList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<CmmnClCode>> {
        return this.get<PageResponse<CmmnClCode>>('/cl', { ...config, params });
    }

    async getClCode(clsfCd: string, config?: AxiosRequestConfig): Promise<CmmnClCode> {
        return this.get<CmmnClCode>(`/cl/${clsfCd}`, config);
    }

    async createClCode(data: Partial<CmmnClCode>, config?: AxiosRequestConfig): Promise<void> {
        return this.post('/cl', data, config);
    }

    async updateClCode(clsfCd: string, data: Partial<CmmnClCode>, config?: AxiosRequestConfig): Promise<void> {
        return this.put(`/cl/${clsfCd}`, data, config);
    }

    async deleteClCode(clsfCd: string, config?: AxiosRequestConfig): Promise<void> {
        return this.delete(`/cl/${clsfCd}`, config);
    }

    // --- 공통코드 (Common Code) ---
    async getCmmnCodeList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<CmmnCode>> {
        return this.get<PageResponse<CmmnCode>>('/cmmn', { ...config, params });
    }

    async getCmmnCode(cdId: string, config?: AxiosRequestConfig): Promise<CmmnCode> {
        return this.get<CmmnCode>(`/cmmn/${cdId}`, config);
    }

    async createCmmnCode(data: Partial<CmmnCode>, config?: AxiosRequestConfig): Promise<void> {
        return this.post('/cmmn', data, config);
    }

    async updateCmmnCode(cdId: string, data: Partial<CmmnCode>, config?: AxiosRequestConfig): Promise<void> {
        return this.put(`/cmmn/${cdId}`, data, config);
    }

    async deleteCmmnCode(cdId: string, config?: AxiosRequestConfig): Promise<void> {
        return this.delete(`/cmmn/${cdId}`, config);
    }

    /**
     * 공통코드 계층 일괄 저장 — 코드 탐색기 편집(드래그앤드롭)의 소속 분류 이동을 반영한다.
     * 각 항목은 cdId·clsfCd 가 모두 필수다(둘 중 하나라도 비면 서버가 400 으로 막는다).
     * tb_com_cd 에 정렬 컬럼이 없어 분류 내 순서는 전송·저장 대상이 아니다.
     */
    async updateCmmnCodeHierarchy(data: CmmnCodeHierarchyItem[], config?: AxiosRequestConfig): Promise<void> {
        return this.put<void>('/cmmn/batch-hierarchy', data, { ...config, timeout: 60000 });
    }

    // --- 상세코드 (Detail Code) ---
    async getDetailCodeList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<CmmnDetailCode>> {
        return this.get<PageResponse<CmmnDetailCode>>('/detail', { ...config, params });
    }

    async getDetailCode(cdId: string, dtlCd: string, config?: AxiosRequestConfig): Promise<CmmnDetailCode> {
        return this.get<CmmnDetailCode>(`/detail/${cdId}/${dtlCd}`, config);
    }

    async createDetailCode(data: Partial<CmmnDetailCode>, config?: AxiosRequestConfig): Promise<void> {
        return this.post('/detail', data, config);
    }

    async updateDetailCode(cdId: string, dtlCd: string, data: Partial<CmmnDetailCode>, config?: AxiosRequestConfig): Promise<void> {
        return this.put(`/detail/${cdId}/${dtlCd}`, data, config);
    }

    async deleteDetailCode(cdId: string, dtlCd: string, config?: AxiosRequestConfig): Promise<void> {
        return this.delete(`/detail/${cdId}/${dtlCd}`, config);
    }

    // --- 행정코드 (Administrative Code) ---
    async getAdministCodeList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<AdministCode>> {
        return this.get<PageResponse<AdministCode>>('/administ', { ...config, params });
    }

    async getAdministCodeDetail(admdstCd: string, config?: AxiosRequestConfig): Promise<AdministCode> {
        return this.get<AdministCode>(`/administ/${admdstCd}`, config);
    }

    async createAdministCode(data: AdministCode, config?: AxiosRequestConfig): Promise<void> {
        return this.post('/administ', data, config);
    }

    async updateAdministCode(admdstCd: string, data: AdministCode, config?: AxiosRequestConfig): Promise<void> {
        return this.put(`/administ/${admdstCd}`, data, config);
    }

    async deleteAdministCode(admdstCd: string, config?: AxiosRequestConfig): Promise<void> {
        return this.delete(`/administ/${admdstCd}`, config);
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
    async processInstitutionCodeRecptn(params: { ocrnYmd: string, instCd: string, jobSn: number }, config?: AxiosRequestConfig): Promise<void> {
        return this.post('/institution/receptions/process', null, { ...config, params });
    }
}

export const codeAdminService = new CodeAdminService();
