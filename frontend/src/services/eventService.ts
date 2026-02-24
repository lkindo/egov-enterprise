import client from '@/lib/api/client';

export interface Event {
  eventId: string;
  eventNm: string;
  eventPurps: string;
  eventBeginDe: string;
  eventEndDe: string;
  eventPlace: string;
  eventCn: string;
  ctgryCode: string; // 1:?됱궗, 2:罹좏럹??
}

export const eventService = {
  getEvents: async (params: { page?: number; size?: number; searchWrd?: string }) => {
    const response = await client.get('/uss/ion/events', { params });
    return response;
  },
  
  getEvent: async (id: string) => {
    const response = await client.get(`/uss/ion/events/${id}`);
    return response;
  }
};

