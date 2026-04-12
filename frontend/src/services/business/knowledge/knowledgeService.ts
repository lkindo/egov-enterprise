import client from '@/lib/api/client';

export interface KnowledgeDto {
  knoId: string;
  knoNm: string;
  knoCn: string;
  knoTypeCd?: string;
  atchFileId?: string;
  frstRegisterId?: string;
  frstRegisterPnttm?: string;
  inqireCo?: number;
  nttSj?: string;
  nttCn?: string;
  ntcrNm?: string;
  frstRegisterPnttmStr?: string;
  bbsId?: string;
  statusCd?: string;
  categoryCd?: string;
  qnaStatus?: string;
  qnaCategory?: string;
  eventDate?: string;
}

export type BoardArticle = KnowledgeDto;


export interface CommentDto {
  id: number;
  nttId: number;
  bbsId: string;
  wrterId: string;
  wrterNm: string;
  commentCn: string;
  createdDate: string;
}


export interface PageResponse<T> {
  list: T[];
  total: number;
  totalPage: number;
  size: number;
  page: number;
}

export interface FileDto {
  atchFileId: string;
  fileSn: number;
  fileExtsn: string;
  fileMg: number;
  orignlFileNm: string;
  streFileNm: string;
}

export const knowledgeService = {
  getArticles: async (params: { bbsId?: string; category?: string; searchWrd?: string; searchCnd?: string; page?: number; size?: number } = {}) => {
    // Redirect to Board API
    const boardParams = {
      bbsId: params.bbsId || 'BBSMSTR_AAAAAAAAAAAA',
      qnaCategory: params.category, // Map Hub category to BBS qnaCategory
      searchWrd: params.searchWrd,
      searchCnd: params.searchCnd || '0',
      page: params.page || 0,
      size: params.size || 20
    };
    const res = await client.get<any>('admin/board/articles', { params: boardParams });
    
    // Map Board fields to Knowledge fields for UI compatibility
    return res;
  },

  getHotArticles: async (bbsId?: string) => {
    const res = await client.get<any>('admin/board/articles', { 
      params: { bbsId: bbsId || 'BBSMSTR_AAAAAAAAAAAA', size: 5, sort: 'inqireCo,desc' } 
    });
    return {
      list: (res.list || []).map((item: any) => ({
        ...item,
        id: item.nttId,
        nttSj: item.nttSj
      }))
    };
  },

  getArticle: async (knoId: string) => {
    // Note: Detail view should also ideally come from board detail API
    return client.get<KnowledgeDto>(`admin/board/articles/${knoId}`);
  },

  getStats: async (bbsId?: string) => {
    const targetBbsId = bbsId || 'BBSMSTR_AAAAAAAAAAAA';
    const res = await client.get<any>(`boards/${targetBbsId}/stats`);
    return res;
  },

  getActivities: async (bbsId?: string) => {
    const res = await client.get<any>('admin/board/articles', { 
      params: { bbsId: bbsId || 'BBSMSTR_AAAAAAAAAAAA', size: 10 } 
    });
    return (res.list || []).map((item: any) => ({
      id: item.nttId,
      type: 'SHARE',
      title: item.nttSj,
      user: item.ntcrNm || item.frstRegisterId,
      time: item.frstRegistPnttm?.split('T')[0] || 'Just now',
      impact: `+${(item.inqireCo || 0) % 100} Reach`
    }));
  }
};
