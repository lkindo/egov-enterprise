import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';

/**
 * 지식 기반 서비스 DTO
 */
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

export interface FileDto {
  atchFileId: string;
  fileSn: number;
  fileExtsn: string;
  fileMg: number;
  orignlFileNm: string;
  streFileNm: string;
}

/**
 * 지식 허브 서비스
 * 공지사항, FAQ, QNA, WIKI, 커뮤니티 등 게시판 기반 지식 데이터 연동
 */
class KnowledgeService extends ApiService {
  private readonly BBS_IDS = {
    NOTICE: 'BBSMSTR_AAAAAAAAAAAA',
    FAQ: 'BBSMSTR_BBBBBBBBBBBB',
    COMMUNITY: 'BBSMSTR_CCCCCCCCCCCC',
    QNA: 'BBSMSTR_DDDDDDDDDDDD',
    WIKI: 'BBSMSTR_EEEEEEEEEEEE',
  };

  constructor() {
    super('/boards');
  }

  /**
   * 게시물 목록 조회 (지식 카테고리 기반)
   */
  public async getArticles(params: {
    bbsId?: string;
    category?: string;
    searchWrd?: string;
    searchCnd?: string;
    page?: number;
    size?: number;
  } = {}): Promise<PageResponse<KnowledgeDto>> {
    let targetBbsId = params.bbsId;
    if (!targetBbsId) {
      if (params.category === 'FAQ') targetBbsId = this.BBS_IDS.FAQ;
      else if (params.category === 'QNA') targetBbsId = this.BBS_IDS.QNA;
      else if (params.category === 'WIKI') targetBbsId = this.BBS_IDS.WIKI;
      else if (params.category === 'COMMUNITY') targetBbsId = this.BBS_IDS.COMMUNITY;
      else targetBbsId = this.BBS_IDS.NOTICE;
    }

    const boardParams = {
      qnaCategory: params.category,
      searchWrd: params.searchWrd,
      searchCnd: params.searchCnd || '0',
      page: params.page || 0,
      size: params.size || 20,
    };

    return this.get<PageResponse<KnowledgeDto>>(`/${targetBbsId}`, { params: boardParams });
  }

  /**
   * 인기 게시물 조회
   */
  public async getHotArticles(bbsId?: string): Promise<{ list: KnowledgeDto[] }> {
    const targetBbsId = bbsId || this.BBS_IDS.NOTICE;
    const res = await this.get<any>(`/${targetBbsId}`, { params: { size: 5, sort: 'inqireCo,desc' } });
    
    return {
      list: (res.list || []).map((item: any) => ({
        ...item,
        id: item.nttId,
        nttSj: item.nttSj,
      })),
    };
  }

  /**
   * 게시물 상세 조회
   */
  public async getArticle(bbsId: string, nttId: string): Promise<KnowledgeDto> {
    return this.get<KnowledgeDto>(`/${bbsId}/posts/${nttId}`);
  }

  /**
   * 게시판 통계 조회
   */
  public async getStats(bbsId?: string): Promise<any> {
    const targetBbsId = bbsId || this.BBS_IDS.NOTICE;
    return this.get<any>(`/${targetBbsId}/stats`);
  }

  /**
   * 최근 활동 피드 조회
   */
  public async getActivities(bbsId?: string): Promise<any[]> {
    const targetBbsId = bbsId || this.BBS_IDS.NOTICE;
    const res = await this.get<any>(`/${targetBbsId}`, { params: { size: 10 } });
    
    return (res.list || []).map((item: any) => ({
      id: item.nttId,
      type: 'SHARE',
      title: item.nttSj,
      user: item.ntcrNm || item.frstRegisterId,
      time: item.frstRegisterPnttm?.split('T')[0] || 'Just now',
      impact: `+${(item.inqireCo || 0) % 100} Reach`,
    }));
  }
}

export const knowledgeService = new KnowledgeService();
