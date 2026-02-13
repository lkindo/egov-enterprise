import client from '@/lib/api/client';
import { Program, ProgramResponse } from '@/types/program';

export const programService = {
  getPrograms: async (params: { page?: number; size?: number; searchWrd?: string }) => {
    const response = await client.get<ProgramResponse>('/admin/programs', { params });
    return response.data;
  },

  getProgram: async (name: string) => {
    const response = await client.get(`/admin/programs/${name}`);
    return response.data;
  },

  createProgram: async (data: Program) => {
    const response = await client.post('/admin/programs', data);
    return response.data;
  },

  updateProgram: async (name: string, data: Program) => {
    const response = await client.put(`/admin/programs/${name}`, data);
    return response.data;
  },

  deleteProgram: async (name: string) => {
    const response = await client.delete(`/admin/programs/${name}`);
    return response.data;
  }
};
