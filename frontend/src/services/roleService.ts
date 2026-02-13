import client from '@/lib/api/client';

export interface AuthorInfo {
  authorCode: string;
  authorNm: string;
  authorDc?: string;
}

export const roleService = {
  /**
   * 전체 권한 목록 조회
   */
  getAuthors: async () => {
    const response = await client.get('/admin/security/authors');
    return response.data;
  }
};
