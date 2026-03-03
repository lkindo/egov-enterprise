import client from '@/lib/api/client';
import { ProgrmManage, SearchParams, PaginationResponse } from '@/types/system';

/**
 * 프로그램 관리 서비스 (Admin)
 * 백엔드: com.company.project.api.controller.program.ProgramApiController
 */
const BASE_URL = '/admin/system/programs';

export const programAdminService = {
    /** 프로그램 목록 조회 (페이징) */
    getProgramList: async (params?: SearchParams, config?: any) => {
        return client.get<PaginationResponse<ProgrmManage>>(BASE_URL, { ...config, params });
    },

    /** 프로그램 목록 조회 (Alias) */
    getPrograms: async (params?: SearchParams, config?: any) => {
        return client.get<PaginationResponse<ProgrmManage>>(BASE_URL, { ...config, params });
    },

    /** 프로그램 상세 조회 */
    getProgram: async (progrmFileNm: string, config?: any) => {
        return client.get<ProgrmManage>(`${BASE_URL}/${progrmFileNm}`, config);
    },

    /** 프로그램 등록 */
    createProgram: async (data: Partial<ProgrmManage>, config?: any) => {
        return client.post<void>(BASE_URL, data, config);
    },

    /** 프로그램 정보 수정 */
    updateProgram: async (progrmFileNm: string, data: Partial<ProgrmManage>, config?: any) => {
        return client.put<void>(`${BASE_URL}/${progrmFileNm}`, data, config);
    },

    /** 프로그램 삭제 */
    deleteProgram: async (progrmFileNm: string, config?: any) => {
        return client.delete<void>(`${BASE_URL}/${progrmFileNm}`, config);
    },
};
