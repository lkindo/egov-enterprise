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
  inqireCo?: number;
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
    return {
      ...res,
      list: (res.list || []).map((item: any) => ({
        ...item,
        id: item.nttId,
        knoId: item.nttId,
        knoNm: item.nttSj,
        knoCn: item.nttCn,
        statusCd: item.qnaStatus, // Use the new qnaStatus field!
        categoryCd: item.qnaCategory,
        frstRegisterPnttmStr: item.frstRegistPnttm?.split('T')[0] || item.frstRegistPnttm
      }))
    };
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
    const res = await client.get<any>('admin/board/articles', { 
      params: { bbsId: bbsId || 'BBSMSTR_AAAAAAAAAAAA', size: 100 } 
    });
    const articles = res.list || [];
    return {
      totalCount: res.total || articles.length,
      totalViews: articles.reduce((acc: number, cur: any) => acc + (cur.inqireCo || 0), 0),
      topContributor: articles.length > 0 ? articles[0]?.ntcrNm : 'N/A',
      intelligenceScore: Math.min(100, (articles.length * 2) + 70) 
    };
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
