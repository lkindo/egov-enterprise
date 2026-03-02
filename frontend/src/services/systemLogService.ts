// 시스템 로그 서비스 (Dummy for fixing type errors)
export interface SystemLog {
    occcrrncDe: string;
    rqesterId: string;
    srvcNm: string;
    methodNm: string;
    errCode: string;
    processTime: number;
}

export const systemLogService = {
    getLogs: async (params?: any, config?: any) => ({} as any),
} as any;
