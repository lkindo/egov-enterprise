import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import type { components } from '@/types/generated-api';

type NoteDto = components['schemas']['NoteDto'];

/** 조회 결과는 DB가 생성한 쪽지 일련번호를 항상 포함한다. */
export type Note = NoteDto & Required<Pick<NoteDto, 'noteSn'>>;

class NoteService extends ApiService {
 constructor() {
 super('/notes');
 }

 /**
 * 諛쏆? 쪽지 목록 조회
 */
 async getReceivedNotes(params: { page?: number; size?: number; searchWrd?: string }): Promise<PageResponse<Note>> {
 return this.get<PageResponse<Note>>('/received', { params });
 }

 /**
 * 보냄 쪽지 목록 조회
 */
 async getSentNotes(params: { page?: number; size?: number; searchWrd?: string }): Promise<PageResponse<Note>> {
 return this.get<PageResponse<Note>>('/sent', { params });
 }

 /**
 * 쪽지 蹂대궡湲 */
 async sendNote(data: { rcverId: string; noteSj: string; noteCn: string }): Promise<void> {
 return this.post<void>('', data);
 }

 /**
 * 쪽지 상세 조회 諛님쎌쓬 泥섎━
 */
 async getNote(noteSn: number, params: { type: string; relationSn: number }): Promise<Note> {
 return this.get<Note>(`/${noteSn}`, { params });
 }

 /**
 * 쪽지 님젣
 */
 async deleteNote(relationSn: number, params: { type: string }): Promise<void> {
  return this.delete<void>(`/${relationSn}`, { params });
 }
}

export const noteService = new NoteService();
