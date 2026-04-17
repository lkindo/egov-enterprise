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
    // 5-Tier Knowledge Board Mapping
    let targetBbsId = params.bbsId;
    if (!targetBbsId) {
      if (params.category === 'FAQ') targetBbsId = 'BBSMSTR_BBBBBBBBBBBB';
      else if (params.category === 'QNA') targetBbsId = 'BBSMSTR_DDDDDDDDDDDD';
      else if (params.category === 'WIKI') targetBbsId = 'BBSMSTR_EEEEEEEEEEEE';
      else if (params.category === 'COMMUNITY') targetBbsId = 'BBSMSTR_CCCCCCCCCCCC';
      else targetBbsId = 'BBSMSTR_AAAAAAAAAAAA'; // Default: Notice
    }

    const boardParams = {
      qnaCategory: params.category, // Map Hub category to BBS qnaCategory
      searchWrd: params.searchWrd,
      searchCnd: params.searchCnd || '0',
      page: params.page || 0,
      size: params.size || 20
    };
    const res = await client.get<any>(`boards/${targetBbsId}`, { params: boardParams });

    // Map Board fields to Knowledge fields for UI compatibility
    return res;
  },

  getHotArticles: async (bbsId?: string) => {
    const targetBbsId = bbsId || 'BBSMSTR_AAAAAAAAAAAA';
    const res = await client.get<any>(`boards/${targetBbsId}`, {
      params: { size: 5, sort: 'inqireCo,desc' }
    });
    return {
      list: (res.list || []).map((item: any) => ({
        ...item,
        id: item.nttId,
        nttSj: item.nttSj
      }))
    };
  },

  getArticle: async (bbsId: string, nttId: string) => {
    return client.get<KnowledgeDto>(`boards/${bbsId}/posts/${nttId}`);
  },

  getStats: async (bbsId?: string) => {
    const targetBbsId = bbsId || 'BBSMSTR_AAAAAAAAAAAA';
    const res = await client.get<any>(`boards/${targetBbsId}/stats`);
    return res;
  },

  getActivities: async (bbsId?: string) => {
    const targetBbsId = bbsId || 'BBSMSTR_AAAAAAAAAAAA';
    const res = await client.get<any>(`boards/${targetBbsId}`, {
      params: { size: 10 }
    });
    return (res.list || []).map((item: any) => ({
      id: item.nttId,
      type: 'SHARE',
      title: item.nttSj,
      user: item.ntcrNm || item.frstRegisterId,
      time: item.frstRegisterPnttm?.split('T')[0] || 'Just now',
      impact: `+${(item.inqireCo || 0) % 100} Reach`
    }));
  }
};
