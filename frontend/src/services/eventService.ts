import client from '@/lib/api/client';

export interface Event {
  eventId: string;
  eventNm: string;
  eventPurps: string;
  eventBeginDe: string;
  eventEndDe: string;
  eventPlace: string;
  eventCn: string;
  ctgryCode: string; // 1:행사, 2:캠페인
}

export const eventService = {
  getEvents: async (params: { page?: number; size?: number; searchWrd?: string }) => {
    const response = await client.get('/uss/ion/events', { params });
    return response.data;
  },
  
  getEvent: async (id: string) => {
    const response = await client.get(`/uss/ion/events/${id}`);
    return response.data;
  }
};
