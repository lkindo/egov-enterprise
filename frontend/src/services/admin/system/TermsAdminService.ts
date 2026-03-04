import { ApiService } from '@/services/core/ApiService';

export interface Term {
    stplatId: string;
    stplatNm: string;
    stplatCn: string;
    lastUpdusrPnttm: string;
}

class TermsAdminService extends ApiService {
    constructor() {
        super('/admin/terms');
    }

    async getTerms() {
        return this.get<any>('');
    }

    async updateTerm(id: string, content: string) {
        return this.put<any>(`/${id}`, { stplatCn: content });
    }
}

export const termsAdminService = new TermsAdminService();
