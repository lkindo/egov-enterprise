import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams, CmmnClCode, CmmnCode, CmmnDetailCode } from '@/types/foundation/system';
import type { AxiosRequestConfig } from 'axios';
import type { components, operations } from '@/types/generated-api';
import {
    createAdministCodeOperation,
    createClCodeOperation,
    createCmmnCodeOperation,
    createDetailCodeOperation,
    deleteAdministCodeOperation,
    deleteClCodeOperation,
    deleteCmmnCodeOperation,
    deleteDetailCodeOperation,
    getAdministCodeDetailOperation,
    getAdministCodeListOperation,
    getClCodeListOperation,
    getClCodeOperation,
    getCmmnCodeListOperation,
    getCmmnCodeOperation,
    getDetailCodeListOperation,
    getDetailCodeOperation,
    getInstitutionCodeListOperation,
    getInstitutionCodeRecptnListOperation,
    processInstitutionCodeRecptnOperation,
    updateAdministCodeOperation,
    updateClCodeOperation,
    updateCmmnCodeHierarchyOperation,
    updateCmmnCodeOperation,
    updateDetailCodeOperation,
} from '@/types/generated-operations';

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
export type CmmnCodeHierarchyItem = components['schemas']['CmmnCodeHierarchyDto'];

type CodeSearchQuery = NonNullable<operations['getClCodeList']['parameters']['query']>;

function toCodeSearchQuery(params?: SearchParams): CodeSearchQuery {
    if (!params) return {};
    const { page, pageNo, size, searchWrd, ...query } = params;
    const generatedQuery = query as CodeSearchQuery;

    if (generatedQuery.pageIndex === undefined) {
        if (pageNo !== undefined) generatedQuery.pageIndex = pageNo;
        else if (page !== undefined) generatedQuery.pageIndex = page + 1;
    }
    if (generatedQuery.pageUnit === undefined) {
        generatedQuery.pageUnit = size ?? generatedQuery.pageSize;
    }
    if (generatedQuery.recordCountPerPage === undefined) {
        generatedQuery.recordCountPerPage = size ?? generatedQuery.pageSize;
    }
    if (generatedQuery.searchKeyword === undefined && searchWrd !== undefined) {
        generatedQuery.searchKeyword = searchWrd;
    }
    return generatedQuery;
}

function requireCodePage<T>(
    response: { list?: T[]; total?: number; page?: number; size?: number; totalPage?: number },
): PageResponse<T> {
    if (
        !Array.isArray(response.list)
        || typeof response.total !== 'number'
        || typeof response.page !== 'number'
        || typeof response.size !== 'number'
        || typeof response.totalPage !== 'number'
    ) {
        throw new Error('코드 페이지 응답이 필수 계약과 일치하지 않습니다.');
    }
    return {
        list: response.list,
        total: response.total,
        page: response.page,
        size: response.size,
        totalPage: response.totalPage,
    };
}

function requireClCode(item: components['schemas']['CmmnClCodeDto']): CmmnClCode {
    if (
        typeof item.clsfCd !== 'string'
        || typeof item.clsfCdNm !== 'string'
        || typeof item.clsfCdExpln !== 'string'
    ) {
        throw new Error('분류코드 응답이 필수 계약과 일치하지 않습니다.');
    }
    return {
        clsfCd: item.clsfCd,
        clsfCdNm: item.clsfCdNm,
        clsfCdExpln: item.clsfCdExpln,
        useYn: item.useYn,
        frstRgtrId: item.frstRgtrId,
        lastMdfrId: item.lastMdfrId,
    };
}

function requireCmmnCode(item: components['schemas']['CmmnCodeDto']): CmmnCode {
    if (
        typeof item.cdId !== 'string'
        || typeof item.cdIdNm !== 'string'
        || typeof item.cdIdExpln !== 'string'
        || typeof item.clsfCd !== 'string'
    ) {
        throw new Error('공통코드 응답이 필수 계약과 일치하지 않습니다.');
    }
    return {
        cdId: item.cdId,
        cdIdNm: item.cdIdNm,
        cdIdExpln: item.cdIdExpln,
        clsfCd: item.clsfCd,
        useYn: item.useYn,
        ...(item.clsfCdNm === undefined ? {} : { clsfCdNm: item.clsfCdNm }),
    };
}

function requireDetailCode(item: components['schemas']['CmmnDetailCodeDto']): CmmnDetailCode {
    if (
        typeof item.cdId !== 'string'
        || typeof item.dtlCd !== 'string'
        || typeof item.dtlCdNm !== 'string'
        || typeof item.dtlCdExpln !== 'string'
    ) {
        throw new Error('상세코드 응답이 필수 계약과 일치하지 않습니다.');
    }
    return {
        cdId: item.cdId,
        dtlCd: item.dtlCd,
        dtlCdNm: item.dtlCdNm,
        dtlCdExpln: item.dtlCdExpln,
        useYn: item.useYn,
        ...(item.cdIdNm === undefined ? {} : { cdIdNm: item.cdIdNm }),
    };
}

function requireAdministCode(item: components['schemas']['AdministCodeDto']): AdministCode {
    if (
        typeof item.admdstCd !== 'string'
        || typeof item.admdstZoneNm !== 'string'
        || typeof item.admdstSeCd !== 'string'
        || typeof item.upAdmdstCd !== 'string'
    ) {
        throw new Error('행정코드 응답이 필수 계약과 일치하지 않습니다.');
    }
    return {
        admdstCd: item.admdstCd,
        admdstZoneNm: item.admdstZoneNm,
        admdstSeCd: item.admdstSeCd,
        upAdmdstCd: item.upAdmdstCd,
        useYn: item.useYn,
    };
}

function toInstitutionCode(
    item: components['schemas']['InstitutionCodeDto'],
): InstitutionCode {
    if (typeof item.instCd !== 'string' || typeof item.allInstNm !== 'string') {
        throw new Error('기관코드 응답이 필수 계약과 일치하지 않습니다.');
    }
    return {
        ...item,
        instCd: item.instCd,
        allInstNm: item.allInstNm,
        lwtrkInstNm: item.lwstInstNm,
        upInstCd: item.uprInstCd,
        rprsInstCd: item.reprsInstCd,
    };
}

function toInstitutionReception(
    item: components['schemas']['InstitutionCodeRecptnDto'],
): InstitutionCodeRecptn {
    if (
        typeof item.ocrnYmd !== 'string'
        || typeof item.instCd !== 'string'
        || typeof item.jobSn !== 'number'
        || typeof item.chgSeCd !== 'string'
        || typeof item.procSe !== 'string'
        || typeof item.allInstNm !== 'string'
        || typeof item.etcCd !== 'string'
        || typeof item.telno !== 'string'
        || typeof item.faxNo !== 'string'
        || typeof item.crtYmd !== 'string'
        || typeof item.ablYmd !== 'string'
        || typeof item.ablYn !== 'string'
        || typeof item.crtDt !== 'string'
        || typeof item.frstRgtrId !== 'string'
    ) {
        throw new Error('기관코드 수신 응답이 필수 계약과 일치하지 않습니다.');
    }
    return {
        ...item,
        ocrnYmd: item.ocrnYmd,
        instCd: item.instCd,
        jobSn: item.jobSn,
        chgSeCd: item.chgSeCd,
        procSe: item.procSe,
        etcCd: item.etcCd,
        allInstNm: item.allInstNm,
        lwtrkInstNm: item.lwstInstNm ?? '',
        telno: item.telno,
        faxNo: item.faxNo,
        crtYmd: item.crtYmd,
        ablYmd: item.ablYmd,
        ablYn: item.ablYn,
        crtDt: item.crtDt,
        frstRgtrId: item.frstRgtrId,
    };
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
        const response = await this.executeGenerated(getClCodeListOperation, {
            query: toCodeSearchQuery(params),
            config,
        });
        const page = requireCodePage(response);
        return { ...page, list: page.list.map(requireClCode) };
    }

    async getClCode(clsfCd: string, config?: AxiosRequestConfig): Promise<CmmnClCode> {
        const response = await this.executeGenerated(getClCodeOperation, { path: { clCode: clsfCd }, config });
        return requireClCode(response);
    }

    async createClCode(data: Partial<CmmnClCode>, config?: AxiosRequestConfig): Promise<void> {
        return this.executeGenerated(createClCodeOperation, {
            body: data as components['schemas']['CmmnClCodeDto'],
            config,
        });
    }

    async updateClCode(clsfCd: string, data: Partial<CmmnClCode>, config?: AxiosRequestConfig): Promise<void> {
        return this.executeGenerated(updateClCodeOperation, {
            path: { clCode: clsfCd },
            body: data as components['schemas']['CmmnClCodeDto'],
            config,
        });
    }

    async deleteClCode(clsfCd: string, config?: AxiosRequestConfig): Promise<void> {
        return this.executeGenerated(deleteClCodeOperation, { path: { clCode: clsfCd }, config });
    }

    // --- 공통코드 (Common Code) ---
    async getCmmnCodeList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<CmmnCode>> {
        const response = await this.executeGenerated(getCmmnCodeListOperation, {
            query: toCodeSearchQuery(params),
            config,
        });
        const page = requireCodePage(response);
        return { ...page, list: page.list.map(requireCmmnCode) };
    }

    async getCmmnCode(cdId: string, config?: AxiosRequestConfig): Promise<CmmnCode> {
        const response = await this.executeGenerated(getCmmnCodeOperation, { path: { codeId: cdId }, config });
        return requireCmmnCode(response);
    }

    async createCmmnCode(data: Partial<CmmnCode>, config?: AxiosRequestConfig): Promise<void> {
        return this.executeGenerated(createCmmnCodeOperation, {
            body: data as components['schemas']['CmmnCodeDto'],
            config,
        });
    }

    async updateCmmnCode(cdId: string, data: Partial<CmmnCode>, config?: AxiosRequestConfig): Promise<void> {
        return this.executeGenerated(updateCmmnCodeOperation, {
            path: { codeId: cdId },
            body: data as components['schemas']['CmmnCodeDto'],
            config,
        });
    }

    async deleteCmmnCode(cdId: string, config?: AxiosRequestConfig): Promise<void> {
        return this.executeGenerated(deleteCmmnCodeOperation, { path: { codeId: cdId }, config });
    }

    /**
     * 공통코드 계층 일괄 저장 — 코드 탐색기 편집(드래그앤드롭)의 소속 분류 이동을 반영한다.
     * 각 항목은 cdId·clsfCd 가 모두 필수다(둘 중 하나라도 비면 서버가 400 으로 막는다).
     * tb_com_cd 에 정렬 컬럼이 없어 분류 내 순서는 전송·저장 대상이 아니다.
     */
    async updateCmmnCodeHierarchy(data: CmmnCodeHierarchyItem[], config?: AxiosRequestConfig): Promise<void> {
        return this.executeGenerated(updateCmmnCodeHierarchyOperation, {
            body: data,
            config: { ...config, timeout: 60000 },
        });
    }

    // --- 상세코드 (Detail Code) ---
    async getDetailCodeList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<CmmnDetailCode>> {
        const response = await this.executeGenerated(getDetailCodeListOperation, {
            query: toCodeSearchQuery(params),
            config,
        });
        const page = requireCodePage(response);
        return { ...page, list: page.list.map(requireDetailCode) };
    }

    async getDetailCode(cdId: string, dtlCd: string, config?: AxiosRequestConfig): Promise<CmmnDetailCode> {
        const response = await this.executeGenerated(getDetailCodeOperation, {
            path: { codeId: cdId, code: dtlCd },
            config,
        });
        return requireDetailCode(response);
    }

    async createDetailCode(data: Partial<CmmnDetailCode>, config?: AxiosRequestConfig): Promise<void> {
        return this.executeGenerated(createDetailCodeOperation, {
            body: data as components['schemas']['CmmnDetailCodeDto'],
            config,
        });
    }

    async updateDetailCode(cdId: string, dtlCd: string, data: Partial<CmmnDetailCode>, config?: AxiosRequestConfig): Promise<void> {
        return this.executeGenerated(updateDetailCodeOperation, {
            path: { codeId: cdId, code: dtlCd },
            body: data as components['schemas']['CmmnDetailCodeDto'],
            config,
        });
    }

    async deleteDetailCode(cdId: string, dtlCd: string, config?: AxiosRequestConfig): Promise<void> {
        return this.executeGenerated(deleteDetailCodeOperation, {
            path: { codeId: cdId, code: dtlCd },
            config,
        });
    }

    // --- 행정코드 (Administrative Code) ---
    async getAdministCodeList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<AdministCode>> {
        const response = await this.executeGenerated(getAdministCodeListOperation, {
            query: toCodeSearchQuery(params),
            config,
        });
        const page = requireCodePage(response);
        return { ...page, list: page.list.map(requireAdministCode) };
    }

    async getAdministCodeDetail(admdstCd: string, config?: AxiosRequestConfig): Promise<AdministCode> {
        const response = await this.executeGenerated(getAdministCodeDetailOperation, {
            path: { code: admdstCd },
            config,
        });
        return requireAdministCode(response);
    }

    async createAdministCode(data: AdministCode, config?: AxiosRequestConfig): Promise<void> {
        return this.executeGenerated(createAdministCodeOperation, {
            body: data as components['schemas']['AdministCodeDto'],
            config,
        });
    }

    async updateAdministCode(admdstCd: string, data: AdministCode, config?: AxiosRequestConfig): Promise<void> {
        return this.executeGenerated(updateAdministCodeOperation, {
            path: { code: admdstCd },
            body: data as components['schemas']['AdministCodeDto'],
            config,
        });
    }

    async deleteAdministCode(admdstCd: string, config?: AxiosRequestConfig): Promise<void> {
        return this.executeGenerated(deleteAdministCodeOperation, {
            path: { code: admdstCd },
            config,
        });
    }

    // --- 기관코드 (Institution Code) ---
    async getInstitutionCodeList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<InstitutionCode>> {
        const response = await this.executeGenerated(getInstitutionCodeListOperation, {
            query: toCodeSearchQuery(params),
            config,
        });
        const page = requireCodePage(response);
        return { ...page, list: page.list.map(toInstitutionCode) };
    }

    /** 기관코드 수신 내역 조회 */
    async getInstitutionCodeRecptnList(params?: SearchParams & { processSe?: string }, config?: AxiosRequestConfig): Promise<PageResponse<InstitutionCodeRecptn>> {
        const response = await this.executeGenerated(getInstitutionCodeRecptnListOperation, {
            query: toCodeSearchQuery(params),
            config,
        });
        const page = requireCodePage(response);
        return { ...page, list: page.list.map(toInstitutionReception) };
    }

    /** 기관코드 수신 처리 */
    async processInstitutionCodeRecptn(target: { ocrnYmd: string, instCd: string, jobSn: number }, config?: AxiosRequestConfig): Promise<void> {
        // 서버 시그니처는 @Valid @RequestBody InstitutionCodeRecptnDto 다. 종전에는 본문 없이
        // 쿼리 파라미터로만 보내 항상 400(Required request body is missing)이었다.
        // 완료 구분값(procSe)은 보내지 않는다 — 서버가 상수로 고정한다.
        return this.executeGenerated(processInstitutionCodeRecptnOperation, { body: target, config });
    }
}

export const codeAdminService = new CodeAdminService();
