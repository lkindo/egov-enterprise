import client from '@/lib/api/client';
import { ProgrmManage, SearchParams, PaginationResponse } from '@/types/system';

/**
 * ?袁⑥쨮域밸챶???온????뺥돩??(Admin)
 * 獄쏄퉮肉?? com.company.project.api.controller.program.ProgramApiController
 */
const BASE_URL = '/admin/system/programs';

export const programAdminService = {
    /** ?袁⑥쨮域밸챶??筌뤴뫖以?鈺곌퀬??(??륁뵠筌? */
    getProgramList: async (params?: SearchParams, config?: any) => {
        return client.get<PaginationResponse<ProgrmManage>>(BASE_URL, { ...config, params });
    },

    /** ?袁⑥쨮域밸챶??筌뤴뫖以?鈺곌퀬??(Alias) */
    getPrograms: async (params?: SearchParams, config?: any) => {
        return client.get<PaginationResponse<ProgrmManage>>(BASE_URL, { ...config, params });
    },

    /** ?袁⑥쨮域밸챶???怨멸쉭 鈺곌퀬??*/
    getProgram: async (progrmFileNm: string, config?: any) => {
        return client.get<ProgrmManage>(`${BASE_URL}/${progrmFileNm}`, config);
    },

    /** ?袁⑥쨮域밸챶???源낆쨯 */
    createProgram: async (data: Partial<ProgrmManage>, config?: any) => {
        return client.post<void>(BASE_URL, data, config);
    },

    /** ?袁⑥쨮域밸챶???類ｋ궖 ??륁젟 */
    updateProgram: async (progrmFileNm: string, data: Partial<ProgrmManage>, config?: any) => {
        return client.put<void>(`${BASE_URL}/${progrmFileNm}`, data, config);
    },

    /** ?袁⑥쨮域밸챶??????*/
    deleteProgram: async (progrmFileNm: string, config?: any) => {
        return client.delete<void>(`${BASE_URL}/${progrmFileNm}`, config);
    },
};
