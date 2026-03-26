import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';

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
 async getReceivedNotes(params: { page?: number; size?: number }): Promise<PageResponse<Note>> {
 return this.get<PageResponse<Note>>('/received', { params });
 }

 /**
 * 보낸 쪽지 목록 조회
 */
 async getSentNotes(params: { page?: number; size?: number }): Promise<PageResponse<Note>> {
 return this.get<PageResponse<Note>>('/sent', { params });
 }

 /**
 * 쪽지 보내기
 */
 async sendNote(data: { rcverId: string; noteSj: string; noteCn: string }): Promise<Note> {
 return this.post<Note>('', data);
 }

 /**
 * 쪽지 상세 조회 및 읽음 처리
 */
 async getNote(id: string): Promise<Note> {
 return this.get<Note>(`/${id}`);
 }

 /**
 * 쪽지 삭제
 */
 async deleteNote(id: string): Promise<void> {
 return this.delete<void>(`/${id}`);
 }
}

export const noteService = new NoteService();
