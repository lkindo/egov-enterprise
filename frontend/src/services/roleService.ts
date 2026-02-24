import client from '@/lib/api/client';

export interface AuthorInfo {
  authorCode: string;
  authorNm: string;
  authorDc?: string;
}

export const roleService = {
  /**
   * ?꾩껜 沅뚰븳 紐⑸줉 議고쉶
   */
  getAuthors: async () => {
    const response = await client.get('/admin/security/authors');
    return response;
  }
};

