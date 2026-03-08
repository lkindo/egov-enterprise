import { ApiService } from '@/services/core/ApiService';

export interface Note {
    noteId: string;
    noteSj: string;
    noteCn: string;
    trnsmitterId: string;
    trnsmitterNm?: string;
    rcverId: string;
    rcverNm?: string;
    sendDt: string;
    openYn: 'Y' | 'N';
}

class NoteService extends ApiService {
    constructor() {
        super('/notes');
    }

    /**
     * 獄쏆룇? 筌잛럩???鈺곌퀬??
     */
    async getReceivedNotes(params: { page?: number; size?: number }) {
        const response = await this.get<any>('/received', { params });
        return response?.result || response;
    }

    /**
     * 癰귣?沅?筌잛럩???鈺곌퀬??
     */
    async getSentNotes(params: { page?: number; size?: number }) {
        const response = await this.get<any>('/sent', { params });
        return response?.result || response;
    }

    /**
     * 筌잛럩? 癰귣?沅→묾?     */
    async sendNote(data: { rcverId: string; noteSj: string; noteCn: string }) {
        const response = await this.post<any>('', data);
        return response?.result || response;
    }

    /**
     * 筌잛럩? ?怨멸쉭 鈺곌퀬??獄???뚯벉 筌ｌ꼶??
     */
    async getNote(id: string) {
        const response = await this.get<any>(`/${id}`);
        return response?.result || response;
    }

    /**
     * 筌잛럩? ????
     */
    async deleteNote(id: string) {
        const response = await this.delete<any>(`/${id}`);
        return response?.result || response;
    }
}

export const noteService = new NoteService();
