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
     * 받은 쪽지 목록 조회
     */
    async getReceivedNotes(params: { page?: number; size?: number }) {
        const response = await this.get<any>('/received', { params });
        return response?.result || response;
    }

    /**
     * 보낸 쪽지 목록 조회
     */
    async getSentNotes(params: { page?: number; size?: number }) {
        const response = await this.get<any>('/sent', { params });
        return response?.result || response;
    }

    /**
     * 쪽지 보내기
     */
    async sendNote(data: { rcverId: string; noteSj: string; noteCn: string }) {
        const response = await this.post<any>('', data);
        return response?.result || response;
    }

    /**
     * 쪽지 상세 조회 및 읽음 처리
     */
    async getNote(id: string) {
        const response = await this.get<any>(`/${id}`);
        return response?.result || response;
    }

    /**
     * 쪽지 삭제
     */
    async deleteNote(id: string) {
        const response = await this.delete<any>(`/${id}`);
        return response?.result || response;
    }
}

export const noteService = new NoteService();
