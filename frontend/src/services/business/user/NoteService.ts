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
 * 받은 쪽지 목록 조회
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
 * 쪽지 보내기
 */
 async sendNote(data: { rcverId: string; noteSj: string; noteCn: string }): Promise<void> {
 return this.executeGenerated(sendNoteOperation, { body: data });
 }

 /**
 * 쪽지 상세 조회 및 읽음 처리.
 *
 * [2026-09-02] 이 주석은 원래부터 '읽음 처리' 를 약속했지만 서버에 그 동작이 없었다
 * (인코딩이 깨진 채 남아 있던 문구다). 이제 받은 쪽지(type=received)는 서버가 열람과
 * 동시에 openYn 을 'Y' 로 바꾼다. 보낸 쪽지(type=sent)에는 읽음 개념이 없다.
 */
 async getNote(noteSn: number, params: { type: string; relationSn: number }): Promise<Note> {
 return this.executeGenerated(getNoteOperation, {
 path: { noteSn },
 query: params,
 }) as Promise<Note>;
 }

 /**
 * 쪽지 삭제
 */
 async deleteNote(relationSn: number, params: { type: string }): Promise<void> {
  return this.executeGenerated(deleteNoteOperation, {
   path: { relationSn },
   query: params,
  });
 }
}

export const noteService = new NoteService();
