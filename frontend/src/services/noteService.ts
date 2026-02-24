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
   * 諛쏆? 履쎌???議고쉶
   */
  getReceivedNotes: async (params: { page?: number; size?: number }) => {
    const response = await client.get('/notes/received', { params });
    return response;
  },

  /**
   * 蹂대궦 履쎌???議고쉶
   */
  getSentNotes: async (params: { page?: number; size?: number }) => {
    const response = await client.get('/notes/sent', { params });
    return response;
  },

  /**
   * 履쎌? 蹂대궡湲?
   */
  sendNote: async (data: { rcverId: string; noteSj: string; noteCn: string }) => {
    const response = await client.post('/notes', data);
    return response;
  },

  /**
   * 履쎌? ?곸꽭 議고쉶 諛??쎌쓬 泥섎━
   */
  getNote: async (id: string) => {
    const response = await client.get(`/notes/${id}`);
    return response;
  },

  /**
   * 履쎌? ??젣
   */
  deleteNote: async (id: string) => {
    const response = await client.delete(`/notes/${id}`);
    return response;
  }
};

