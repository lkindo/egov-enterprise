import client from '@/lib/api/client';
import { AddressBook, NameCard } from '@/types/addressbook';

export const addressbookService = {
  /**
   * 二쇱냼濡?紐⑸줉 議고쉶
   */
  getAddressBooks: async (params: { page?: number; size?: number; searchWrd?: string }) => {
    const response = await client.get('/addressbooks', { params });
    return response;
  },

  /**
   * 紐낇븿 ?곸꽭 議고쉶 (?ъ슜??寃??寃곌낵??
   */
  getNameCard: async (id: string) => {
    const response = await client.get<{ data: NameCard }>(`/namecards/${id}`);
    return response;
  },

  /**
   * ?꾩궗 ?ъ슜??二쇱냼濡?寃??
   */
  searchUsers: async (keyword: string) => {
    const response = await client.get('/addressbooks/users', {
      params: { keyword }
    });
    return response;
  }
};

