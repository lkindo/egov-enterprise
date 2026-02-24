import client from '@/lib/api/client';

export interface EventCmpgn {
  eventId: string;
  eventNm: string;
  eventCn: string;
  eventBeginDe: string;
  eventEndDe: string;
  receptBeginDe: string;
  receptEndDe: string;
  eventTyCode: string; // 1:?됱궗, 2:罹좏럹??
  eventTyNm?: string;
  frstRegisterId?: string;
}

export const eventCmpgnService = {
  getEventCmpgnList: async (params: { page?: number; size?: number; eventCn?: string }) => {
    const response = await client.get('/admin/system/event-campaigns', { params });
    return response;
  },

  getEventCmpgn: async (id: string) => {
    const response = await client.get(`/admin/system/event-campaigns/${id}`);
    return response;
  },

  createEventCmpgn: async (data: Partial<EventCmpgn>) => {
    const response = await client.post('/admin/system/event-campaigns', data);
    return response;
  },

  updateEventCmpgn: async (id: string, data: Partial<EventCmpgn>) => {
    const response = await client.put(`/admin/system/event-campaigns/${id}`, data);
    return response;
  },

  deleteEventCmpgn: async (id: string) => {
    const response = await client.delete(`/admin/system/event-campaigns/${id}`);
    return response;
  }
};

