import client from '@/lib/api/client';

export interface RoughMapInfo {
  roughMapId: string;
  roughMapSj: string;
  roughMapAddress: string;
  roughMapCn: string;
  lat: number;
  lng: number;
  markerType: string;
  frstRegisterId?: string;
  createdDate?: string;
}

export interface PageResponse<T> {
  list: T[];
  total: number;
}

const BASE_URL = 'rough-maps';

export const roughMapService = {
  getRoughMaps: async (params: { keyword?: string; page?: number; size?: number } = {}) => {
    return client.get<PageResponse<RoughMapInfo>>(BASE_URL, { params });
  },
  getRoughMap: async (id: string) => {
    return client.get<RoughMapInfo>(`${BASE_URL}/${id}`);
  },
  createRoughMap: async (data: Partial<RoughMapInfo>) => {
    return client.post<void>(BASE_URL, data);
  },
  updateRoughMap: async (id: string, data: Partial<RoughMapInfo>) => {
    return client.put<void>(`${BASE_URL}/${id}`, data);
  },
  deleteRoughMap: async (id: string) => {
    return client.delete<void>(`${BASE_URL}/${id}`);
  }
};
