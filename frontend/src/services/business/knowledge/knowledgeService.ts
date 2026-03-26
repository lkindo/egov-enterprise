import client from '@/lib/api/client';

export interface BoardArticle {
  id: number;
  bbsId: string;
  nttSj: string;
  nttCn: string;
  ntcrId: string;
  ntcrNm: string;
  frstRegisterPnttmStr: string;
  inqireCo: number;
  atchFileId: string;
}


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

// Define API_BASE_URL if it's not already defined elsewhere
// For example, from process.env or a config file
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';


export const knowledgeService = {
  getArticles: async (params: { bbsId?: string; page?: number; size?: number; searchCnd?: string; searchWrd?: string; sort?: string } = {}) => {
    return client.get<PageResponse<BoardArticle>>(`bbs/${params.bbsId || 'BBSMSTR_AAAAAAAAAAAA'}`, { params });
  },
  getHotArticles: async (bbsId?: string) => {
    const params = { bbsId: bbsId || 'BBSMSTR_AAAAAAAAAAAA', size: 5, sort: 'inqireCo,desc' };
    return client.get<PageResponse<BoardArticle>>(`bbs/${params.bbsId}`, { params });
  },
  getArticle: async (bbsId: string, nttId: string | number) => {
    return client.get<BoardArticle>(`bbs/${bbsId}/${nttId}`);
  },
  getComments: async (bbsId: string, nttId: string | number) => {
    return client.get<PageResponse<CommentDto>>(`comments`, { params: { bbsId, nttId } });
  },
  getFiles: async (atchFileId: string) => {
    return client.get<FileDto[]>(`files/${atchFileId}`);
  },
  getDownloadUrl: (atchFileId: string, fileSn: number) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
    return `${baseUrl}/files/${atchFileId}/${fileSn}`;
  },
  getStats: async (bbsId: string) => {
    const res = await client.get<PageResponse<BoardArticle>>(`bbs/${bbsId}`, { params: { size: 100 } });
    const articles = res.list || [];
    return {
      totalCount: res.total || articles.length,
      totalViews: articles.reduce((acc, cur) => acc + (cur.inqireCo || 0), 0),
      topContributor: articles.length > 0 ? articles[0].ntcrNm : 'N/A',
      intelligenceScore: Math.min(100, (articles.length * 1.5) + (articles.reduce((acc, cur) => acc + (cur.inqireCo || 0), 0) / 10))
    };
  },
  getActivities: async (bbsId: string) => {
    const res = await client.get<PageResponse<BoardArticle>>(`bbs/${bbsId}`, { params: { size: 10 } });
    return (res.list || []).map(item => ({
      id: item.id,
      type: 'SHARE',
      title: item.nttSj,
      user: item.ntcrNm,
      time: item.frstRegisterPnttmStr,
      impact: `+${(item.inqireCo || 0) % 100} Reach`
    }));
  }
};


