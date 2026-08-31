import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import type { components } from '@/types/generated-api';
import {
 deleteNoteOperation,
 getNoteOperation,
 getReceivedNotesOperation,
 getSentNotesOperation,
 sendNoteOperation,
} from '@/types/generated-operations';

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
 const response = await this.executeGenerated(getReceivedNotesOperation, { query: params });
 return response as PageResponse<Note>;
 }

 /**
 * 보냄 쪽지 목록 조회
 */
 async getSentNotes(params: { page?: number; size?: number; searchWrd?: string }): Promise<PageResponse<Note>> {
 const response = await this.executeGenerated(getSentNotesOperation, { query: params });
 return response as PageResponse<Note>;
 }

 /**
 * 쪽지 蹂대궡湲 */
 async sendNote(data: { rcverId: string; noteSj: string; noteCn: string }): Promise<void> {
 return this.executeGenerated(sendNoteOperation, { body: data });
 }

 /**
 * 쪽지 상세 조회 諛님쎌쓬 泥섎━
 */
 async getNote(noteSn: number, params: { type: string; relationSn: number }): Promise<Note> {
 return this.executeGenerated(getNoteOperation, {
 path: { noteSn },
 query: params,
 }) as Promise<Note>;
 }

 /**
 * 쪽지 님젣
 */
 async deleteNote(relationSn: number, params: { type: string }): Promise<void> {
  return this.executeGenerated(deleteNoteOperation, {
   path: { relationSn },
   query: params,
  });
 }
}

export const noteService = new NoteService();
