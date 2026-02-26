import client from '@/lib/api/client';
import { Program, ProgramResponse } from '@/types/program';

export const programService = {
    getPrograms: async (params: { page?: number; size?: number; searchWrd?: string }, config?: any): Promise<ProgramResponse> =>
        client.get<ProgramResponse>('/admin/programs', { ...config, params }),

    getProgram: async (name: string, config?: any): Promise<Program> =>
        client.get<Program>(`/admin/programs/${name}`, config),

    createProgram: async (data: Program, config?: any): Promise<void> =>
        client.post('/admin/programs', data, config),

    updateProgram: async (name: string, data: Program, config?: any): Promise<void> =>
        client.put(`/admin/programs/${name}`, data, config),

    deleteProgram: async (name: string, config?: any): Promise<void> =>
        client.delete(`/admin/programs/${name}`, config),
};
