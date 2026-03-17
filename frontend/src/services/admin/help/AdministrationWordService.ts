import axios from 'axios';
import { AdministrationWord, HelpSearchParams } from '@/types/help';
import { ApiResponse, PageResponse } from '@/types/system';

const API_BASE_URL = '/api/v1/help';

export const administrationWordService = {
  getWords: async (params: HelpSearchParams) => {
    const response = await axios.get<ApiResponse<PageResponse<AdministrationWord>>>(`${API_BASE_URL}/words`, { params });
    return response.data;
  },

  getWord: async (id: string) => {
    const response = await axios.get<ApiResponse<AdministrationWord>>(`${API_BASE_URL}/words/${id}`);
    return response.data;
  },

  createWord: async (data: AdministrationWord) => {
    const response = await axios.post<ApiResponse<string>>(`${API_BASE_URL}/words`, data);
    return response.data;
  },

  updateWord: async (id: string, data: AdministrationWord) => {
    const response = await axios.put<ApiResponse<void>>(`${API_BASE_URL}/words/${id}`, data);
    return response.data;
  },

  deleteWord: async (id: string) => {
    const response = await axios.delete<ApiResponse<void>>(`${API_BASE_URL}/words/${id}`);
    return response.data;
  }
};
