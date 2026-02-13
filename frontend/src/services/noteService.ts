import client from '@/lib/api/client';

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

export const noteService = {
  /**
   * 받은 쪽지함 조회
   */
  getReceivedNotes: async (params: { page?: number; size?: number }) => {
    const response = await client.get('/notes/received', { params });
    return response.data;
  },

  /**
   * 보낸 쪽지함 조회
   */
  getSentNotes: async (params: { page?: number; size?: number }) => {
    const response = await client.get('/notes/sent', { params });
    return response.data;
  },

  /**
   * 쪽지 보내기
   */
  sendNote: async (data: { rcverId: string; noteSj: string; noteCn: string }) => {
    const response = await client.post('/notes', data);
    return response.data;
  },

  /**
   * 쪽지 상세 조회 및 읽음 처리
   */
  getNote: async (id: string) => {
    const response = await client.get(`/notes/${id}`);
    return response.data;
  },

  /**
   * 쪽지 삭제
   */
  deleteNote: async (id: string) => {
    const response = await client.delete(`/notes/${id}`);
    return response.data;
  }
};
