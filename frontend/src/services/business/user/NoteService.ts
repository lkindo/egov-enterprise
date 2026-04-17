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
 * 諛쏆? 履쎌? 紐⑸줉 조회
 */
 async getReceivedNotes(params: { page?: number; size?: number; searchWrd?: string }): Promise<PageResponse<Note>> {
 return this.get<PageResponse<Note>>('/received', { params });
 }

 /**
 * 보냄 履쎌? 紐⑸줉 조회
 */
 async getSentNotes(params: { page?: number; size?: number; searchWrd?: string }): Promise<PageResponse<Note>> {
 return this.get<PageResponse<Note>>('/sent', { params });
 }

 /**
 * 履쎌? 蹂대궡湲 */
 async sendNote(data: { rcverId: string; noteSj: string; noteCn: string }): Promise<Note> {
 return this.post<Note>('', data);
 }

 /**
 * 履쎌? 상세 조회 諛님쎌쓬 泥섎━
 */
 async getNote(id: string, params: { type: string; relationId: string }): Promise<Note> {
 return this.get<Note>(`/${id}`, { params });
 }

 /**
 * 履쎌? 님젣
 */
 async deleteNote(relationId: string, params: { type: string }): Promise<void> {
  return this.delete<void>(`/${relationId}`, { params });
 }
}

export const noteService = new NoteService();
