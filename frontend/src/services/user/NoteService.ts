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
     * 받은 쪽지함 조회
     */
    async getReceivedNotes(params: { page?: number; size?: number }) {
        return this.get<any>('/received', { params });
    }

    /**
     * 보낸 쪽지함 조회
     */
    async getSentNotes(params: { page?: number; size?: number }) {
        return this.get<any>('/sent', { params });
    }

    /**
     * 쪽지 보내기
     */
    async sendNote(data: { rcverId: string; noteSj: string; noteCn: string }) {
        return this.post<any>('', data);
    }

    /**
     * 쪽지 상세 조회 및 읽음 처리
     */
    async getNote(id: string) {
        return this.get<any>(`/${id}`);
    }

    /**
     * 쪽지 삭제
     */
    async deleteNote(id: string) {
        return this.delete<any>(`/${id}`);
    }
}

export const noteService = new NoteService();
