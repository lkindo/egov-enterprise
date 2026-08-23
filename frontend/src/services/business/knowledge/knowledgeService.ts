import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import {
  COMMUNITY_BOARD_ID,
  KNOWLEDGE_FAQ_BOARD_ID,
  NOTICE_BOARD_ID,
  QNA_BOARD_ID,
  WIKI_BOARD_ID,
} from '@/config/board-ids';

/**
 * 지식 기반 서비스 DTO (Enterprise v5 Standard)
 */
export interface KnowledgeDto {
  pstSn: number;
  pstTtl: string;
  pstCn: string;
  atchFileSn?: number;
  frstRgtrId?: string;
  /** 게시글 owner-or-admin mutation 판정에 사용하는 API 작성자 식별자. */
  userId?: string;
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
  // 카테고리→게시판 대응은 board-ids SSOT를 쓰되, FAQ 축이 help(공지 통합)와
  // 다른 기존 값(KNOWLEDGE_FAQ_BOARD_ID)을 그대로 보존한다(H4).
  private readonly BBS_IDS = {
    NOTICE: NOTICE_BOARD_ID,
    FAQ: KNOWLEDGE_FAQ_BOARD_ID,
    COMMUNITY: COMMUNITY_BOARD_ID,
    QNA: QNA_BOARD_ID,
    WIKI: WIKI_BOARD_ID,
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
