import client from '@/lib/api/client';
import { AddressBook, NameCard } from '@/types/addressbook';

export const addressbookService = {
  /**
   * 주소록 목록 조회
   */
  getAddressBooks: async (params: { page?: number; size?: number; searchWrd?: string }) => {
    const response = await client.get('/addressbooks', { params });
    return response;
  },

  /**
   * 명함 상세 조회 (사용자 검색 결과용)
   */
  getNameCard: async (id: string) => {
    const response = await client.get<{ data: NameCard }>(`/namecards/${id}`);
    return response;
  },

  /**
   * 전사 사용자 주소록 검색
   */
  searchUsers: async (keyword: string) => {
    const response = await client.get('/addressbooks/users', {
      params: { keyword }
    });
    return response;
  }
};
