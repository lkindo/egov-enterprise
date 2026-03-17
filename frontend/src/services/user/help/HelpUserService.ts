import { UserService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/system';
import { AxiosRequestConfig } from 'axios';

export interface FAQ {
    faqId: string;
    qestnSj: string;
    qestnCn: string;
    answerCn: string;
    inqireCo: number;
    lastUpdusrPnttm: string;
}

export interface QNA {
    qaId: string;
    qestnSj: string;
    qestnCn: string;
    answerCn?: string;
    writngPassword?: string;
    wrterNm: string;
    writngDe: string;
    qnaProcessSttusCode: string; // 1: 접수, 2: 처리중, 3: 답변완료
}

/**
 * 도움말 센터 서비스 (User)
 */
class HelpUserService extends UserService {
    constructor() {
        super('');
    }

    /** FAQ 목록 조회 */
    async getFaqs(params: { searchWrd?: string }, config?: AxiosRequestConfig): Promise<FAQ[]> {
        // FAQ는 보통 전체 목록을 가져오는 경우가 많음 (배경 구조에 따라 PageResponse일 수도 있으나 현재 UI는 배열 기대)
        return this.get<FAQ[]>('/faqs', { ...config, params });
    }

    /** Q&A 목록 조회 (페이징) */
    async getQnas(params: { page?: number; size?: number; searchWrd?: string }, config?: AxiosRequestConfig): Promise<PageResponse<QNA>> {
        return this.get<PageResponse<QNA>>('/qnas', { ...config, params });
    }

    /** Q&A 등록 */
    async createQna(data: Partial<QNA>, config?: AxiosRequestConfig): Promise<void> {
        return this.post<void>('/qnas', data, config);
    }
}

export const helpUserService = new HelpUserService();
