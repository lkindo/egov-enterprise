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
  bbsId?: string; // Add these for compatibility
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
  getArticles: async (params: { bbsId?: string; searchWrd?: string; searchCnd?: string; page?: number; size?: number } = {}) => {
    return client.get<PageResponse<KnowledgeDto>>('admin/digital-assets', { params });
  },
  getHotArticles: async (bbsId?: string) => {
    // Note: DAM API might not have a specific 'hot' endpoint yet, so we use list with sorting or fallback
    return client.get<PageResponse<KnowledgeDto>>('admin/digital-assets', { params: { bbsId, size: 5, sort: 'inqireCo,desc' } });
  },
  getArticle: async (knoId: string) => {
    return client.get<KnowledgeDto>(`admin/digital-assets/${knoId}`);
  },
  getStats: async (bbsId?: string) => {
    const res = await client.get<PageResponse<KnowledgeDto>>('admin/digital-assets', { params: { bbsId, size: 100 } });
    const articles = res.list || [];
    return {
      totalCount: res.total || articles.length,
      totalViews: articles.reduce((acc, cur) => acc + (cur.inqireCo || 0), 0),
      topContributor: articles.length > 0 ? articles[0]?.ntcrNm : 'N/A',
      intelligenceScore: Math.min(100, (articles.length * 1.5) + (articles.reduce((acc, cur) => acc + (cur.inqireCo || 0), 0) / 10))
    };
  },
  getActivities: async (bbsId?: string) => {
    const res = await client.get<PageResponse<KnowledgeDto>>('admin/digital-assets', { params: { bbsId, size: 10 } });
    return (res.list || []).map(item => ({
      id: item.knoId,
      type: 'SHARE',
      title: item.knoNm,
      user: item.frstRegisterId, // Using frstRegisterId for user
      time: item.frstRegisterPnttm,
      impact: `+${(item.inqireCo || 0) % 100} Reach`
    }));
  }
};
