import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';

/**
 * 지식 기반 서비스 DTO (Enterprise v5 Standard)
 */
export interface KnowledgeDto {
  pstSn: number;
  pstTtl: string;
  pstCn: string;
  atchFileId?: string;
  frstRgtrId?: string;
  crtDt?: string;
  inqCnt?: number;
  frstRegisterNm?: string;
  frstRegisterPnttmStr?: string;
  bbsId?: string;
  statusCd?: string;
  categoryCd?: string;
  qnaSttsCd?: string;
  qnaCatCd?: string;
  evntDt?: string;
  likeCnt?: number;
  commentCnt?: number;
  // Legacy mappings for backward compatibility during transition if needed
  knoId?: string;
  knoNm?: string;
  knoCn?: string;
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
      qnaCatCd: params.category,
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
    const res = await this.get<any>(`/${targetBbsId}`, { params: { size: 5, sort: 'inqCnt,desc' } });
    
    return {
      list: (res.list || []).map((item: any) => ({
        ...item,
        pstSn: item.pstSn || item.nttId,
        pstTtl: item.pstTtl || item.nttSj,
      })),
    };
  }

  /**
   * 게시물 상세 조회
   */
  public async getArticle(bbsId: string, pstSn: number): Promise<KnowledgeDto> {
    return this.get<KnowledgeDto>(`/${bbsId}/posts/${pstSn}`);
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
      id: item.pstSn || item.nttId,
      type: 'SHARE',
      title: item.pstTtl || item.nttSj,
      user: item.userNm || item.frstRgtrId,
      time: item.crtDt?.split('T')[0] || 'Just now',
      impact: `+${(item.inqCnt || 0) % 100} Reach`,
    }));
  }
}

export const knowledgeService = new KnowledgeService();
