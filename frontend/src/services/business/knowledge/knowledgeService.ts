import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import {
  COMMUNITY_BOARD_ID,
  KNOWLEDGE_FAQ_BOARD_ID,
  NOTICE_BOARD_ID,
  QNA_BOARD_ID,
  WIKI_BOARD_ID,
} from '@/config/board-ids';
import {
  getPostOperation,
  getPostsOperation,
  getStats_1Operation,
} from '@/types/generated-operations';
import type { BoardDto, BoardStatsResponse } from '@/types/generated-zod';

/*
 * [2026-09-26 DIP V2] 레거시 필드명 폴백(`nttId`·`nttSj`·`frstRgtrId`)을 걷었다. 종전 주석은 "서버가 같은 자원을
 *   레거시 필드명으로도 내려준다" 고 적었지만 BoardDto 에는 그 필드도 별칭(@JsonAlias)도 없다 — 폴백을 증명하던
 *   계약은 서버가 보내지 않는 필드로 만든 테스트 픽스처였다. 작성자는 userNm, 작성 일시는 crtDt 다.
 */

export interface KnowledgeActivityItem {
  id: number;
  type: string;
  title: string;
  user: string;
  time: string;
}

/**
 * 지식 기반 서비스 DTO (Enterprise v5 Standard)
 */
export interface KnowledgeDto {
  pstSn: number;
  pstTtl: string;
  pstCn: string;
  atchFileSn?: number;
  /** 게시글 owner-or-admin mutation 판정에 사용하는 API 작성자 식별자. */
  userId?: string;
  /** 작성자 이름(BoardDto.userNm). */
  userNm?: string;
  /** 작성 일시(BoardDto.crtDt, ISO). */
  crtDt?: string;
  inqCnt?: number;
  bbsId?: string;
  qnaSttsCd?: string;
  qnaCatCd?: string;
  evntDt?: string;
  likeCnt?: number;
  commentCnt?: number;
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
    orderBy?: 'date' | 'views';
  } = {}): Promise<PageResponse<KnowledgeDto>> {
    let targetBbsId = params.bbsId;
    if (!targetBbsId) {
      if (params.category === 'FAQ') targetBbsId = this.BBS_IDS.FAQ;
      else if (params.category === 'QNA') targetBbsId = this.BBS_IDS.QNA;
      else if (params.category === 'WIKI') targetBbsId = this.BBS_IDS.WIKI;
      else if (params.category === 'COMMUNITY') targetBbsId = this.BBS_IDS.COMMUNITY;
      else targetBbsId = this.BBS_IDS.NOTICE;
    }

    // [2026-09-25] category 는 게시판을 고르는 키일 뿐이다. 종전에는 이 값을 qnaCategory 로도 보내
    //   서버가 qna_cat_cd = 'FAQ'·'QNA'·'WIKI'·'COMMUNITY' 로 등치 필터를 걸었는데, 그 값을 쓰는 경로가
    //   저장소 어디에도 없다(등록은 빈 값이나 Q&A 분류 CAT01 을 저장한다). 그래서 네 탭의 주 목록이 늘
    //   비고, 필터가 없는 인기·최근 목록에만 글이 보였다(OCI 실측: 해당 값 0행). qnaCategory 는 Q&A 분류
    //   필터로 서버에 남는다 — 탭 이름을 그 자리에 넣지 않는다.
    const boardParams = {
      searchWrd: params.searchWrd,
      searchCnd: params.searchCnd || '0',
      page: params.page || 0,
      size: params.size || 20,
      orderBy: params.orderBy,
    };

    return this.executeGenerated(getPostsOperation, {
      path: { bbsId: targetBbsId },
      query: boardParams,
    }) as Promise<PageResponse<KnowledgeDto>>;
  }

  /**
   * 인기 게시물 조회
   */
  public async getHotArticles(bbsId?: string): Promise<{ list: KnowledgeDto[] }> {
    const targetBbsId = bbsId || this.BBS_IDS.NOTICE;
    /*
     * [2026-08-29] `sort: 'inqCnt,desc'` 를 서버가 해석하는 `orderBy` 로 바꾼다.
     * 게시판 목록 API 가 읽는 정렬 파라미터는 orderBy 이고 값 도메인은 date·views·comments 다
     * (BoardSearchCondition:16, BoardRepositoryImpl 의 switch). `sort` 는 어디서도 읽지 않아
     * 조용히 무시됐고, 결과는 기본 정렬(sortOrdr desc)의 상위 5건이었다 — 화면은 그것을
     * 순위 숫자와 조회수와 함께 '인기 문서 / 조회수가 높은 문서' 라고 불렀다.
     */
    const res = await this.executeGenerated(getPostsOperation, {
      path: { bbsId: targetBbsId },
      query: { size: 5, orderBy: 'views' },
    });
    
    return {
      list: (res.list || []).map((item: BoardDto): KnowledgeDto => ({
        pstSn: item.pstSn ?? 0,
        pstTtl: item.pstTtl ?? '',
        pstCn: item.pstCn ?? '',
        atchFileSn: item.atchFileSn ?? undefined,
        userId: item.userId ?? undefined,
        userNm: item.userNm ?? undefined,
        crtDt: item.crtDt ?? undefined,
        inqCnt: item.inqCnt ?? undefined,
        bbsId: item.bbsId,
        qnaSttsCd: item.qnaSttsCd ?? undefined,
        qnaCatCd: item.qnaCatCd ?? undefined,
        evntDt: item.evntDt ?? undefined,
        likeCnt: item.likeCnt ?? undefined,
        commentCnt: item.commentCnt ?? undefined,
      })),
    };
  }

  /**
   * 게시물 상세 조회
   */
  /**
   * 게시글 상세. `countView: false` 는 조회수를 올리지 않는다 — 수정 화면처럼 글을 "읽는" 것이 아닌
   * 진입에 쓴다(2026-09-25 DIP I8). 기본은 서버 기본값(올림)을 따른다.
   */
  public async getArticle(bbsId: string, pstSn: number, options: { countView?: boolean } = {}): Promise<KnowledgeDto> {
    return this.executeGenerated(getPostOperation, {
      path: { bbsId, pstSn },
      ...(options.countView === false ? { query: { countView: false } } : {}),
    }) as Promise<KnowledgeDto>;
  }

  /**
   * 게시판 통계 조회
   */
  public async getStats(bbsId?: string): Promise<BoardStatsResponse | null | undefined> {
    const targetBbsId = bbsId || this.BBS_IDS.NOTICE;
    return this.executeGenerated(getStats_1Operation, {
      path: { bbsId: targetBbsId },
    });
  }

  /**
   * 최근 활동 피드 조회
   */
  public async getActivities(bbsId?: string): Promise<KnowledgeActivityItem[]> {
    const targetBbsId = bbsId || this.BBS_IDS.NOTICE;
    const res = await this.executeGenerated(getPostsOperation, {
      path: { bbsId: targetBbsId },
      query: { size: 10 },
    });
    
    // [2026-09-26 DIP V2] 모르는 값은 '-' 다. 종전의 'Anonymous'·'Just now' 는 사실이 아니었고(작성일이 없는 글을
    //   '방금' 으로 말했다), 작성자 폴백의 로그인 ID 는 화면에 싣지 않는다. 쓰이지 않던 지어낸 영향 지표(+N Reach)도 걷었다.
    return (res.list || []).map((item: BoardDto): KnowledgeActivityItem => ({
      id: item.pstSn ?? 0,
      type: 'SHARE',
      title: item.pstTtl ?? '',
      user: item.userNm || '-',
      time: item.crtDt?.slice(0, 10) || '-',
    }));
  }
}

export const knowledgeService = new KnowledgeService();
