import client from '@/lib/api/client';

export interface EventCmpgn {
  eventId: string;
  eventNm: string;
  eventCn: string;
  eventBeginDe: string;
  eventEndDe: string;
  receptBeginDe: string;
  receptEndDe: string;
  eventTyCode: string; // 1:행사, 2:캠페인
  eventTyNm?: string;
  frstRegisterId?: string;
}

export const eventCmpgnService = {
  getEventCmpgnList: async (params: { page?: number; size?: number; eventCn?: string }) => {
    const response = await client.get('/admin/system/event-campaigns', { params });
    return response.data;
  },

  getEventCmpgn: async (id: string) => {
    const response = await client.get(`/admin/system/event-campaigns/${id}`);
    return response.data;
  },

  createEventCmpgn: async (data: Partial<EventCmpgn>) => {
    const response = await client.post('/admin/system/event-campaigns', data);
    return response.data;
  },

  updateEventCmpgn: async (id: string, data: Partial<EventCmpgn>) => {
    const response = await client.put(`/admin/system/event-campaigns/${id}`, data);
    return response.data;
  },

  deleteEventCmpgn: async (id: string) => {
    const response = await client.delete(`/admin/system/event-campaigns/${id}`);
    return response.data;
  }
};
