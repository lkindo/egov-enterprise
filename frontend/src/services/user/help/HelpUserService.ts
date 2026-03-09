import { UserService } from '@/services/core/ApiService';

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
    qnaProcessSttusCode: string; // 1:?臾믩땾, 2:???餓? 3:????袁⑥┷
}

class HelpUserService extends UserService {
    constructor() {
        super('');
    }

    async getFaqs(params: { searchWrd?: string }) {
        return this.get<any>('/faqs', { params });
    }

    async getQnas(params: { page?: number; size?: number; searchWrd?: string }) {
        return this.get<any>('/qnas', { params });
    }

    async createQna(data: Partial<QNA>) {
        return this.post<any>('/qnas', data);
    }
}

export const helpUserService = new HelpUserService();
