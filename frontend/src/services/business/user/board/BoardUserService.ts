import type { AxiosRequestConfig } from 'axios';
import { UserService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { BoardPost } from '@/types/business/board';
import type { components } from '@/types/generated-api';

import {
  getBoardMetaOperation,
  getPostsOperation,
  likePostOperation,
  markQuestionSolvedOperation,
  searchPostsOperation,
} from '@/types/generated-operations';

/**
 * 통합 검색 결과 1건. 백엔드 `BoardSearchItemResponse` 와 1:1 대응한다.
 *
 * 본문({@code pstCn})과 게시글 비밀번호는 담기지 않는다 — 서버가 목록 표면을 의도적으로
 * 좁힌 것이니, 화면에서 필요해 보이더라도 필드를 늘리기 전에 노출면부터 따져야 한다.
 */
/** 게시판 제목·설명·템플릿·설정(읽기 전용). 백엔드 `BoardMetaDto` 와 1:1 대응한다. */
export type BoardMeta = components['schemas']['BoardMetaDto'];

export interface BoardSearchResultItem {
  bbsId: string;
  pstSn: number;
  pstTtl?: string;
  userNm?: string;
  inqCnt?: number;
  crtDt?: string;
}

class BoardUserService extends UserService {
  constructor() {
    super('/boards');
  }

  /**
   * 활성 게시판 전체에서 게시글 **제목**을 검색한다(통합 검색 전용).
   *
   * 서버가 검색어 2자 미만이면 빈 목록을, 그 이상이면 최대 20건을 돌려준다.
   * 페이징이 없는 것은 의도다 — 담당자 검색과 같은 이유로 호출부에서 page 를 넘기지 말 것.
   * 본문은 검색하지 않는다(에디터 HTML 원문이라 태그·속성이 그대로 매칭된다).
   */
  async searchPosts(keyword: string): Promise<BoardSearchResultItem[]> {
    return this.executeGenerated(searchPostsOperation, {
      query: { keyword },
    }) as Promise<BoardSearchResultItem[]>;
  }

  /**
   * 게시글 목록 조회.
   * `page` 는 Spring Pageable 규약대로 0-based 다(호출부에서 1-based UI 값을 변환해 전달할 것).
   * orderBy/startDate/endDate/qnaStatus/qnaCategory 는 BoardApiController#getPosts 가 지원하는 필터다.
   */
  async getPosts(bbsId: string, params: {
    page?: number;
    size?: number;
    searchWrd?: string;
    searchCnd?: string;
    orderBy?: string;
    startDate?: string;
    endDate?: string;
    qnaStatus?: string;
    qnaCategory?: string;
    /** 기간 기준. 비우면 작성일, 'EVENT' 면 행사일(없으면 작성일) — 캘린더 템플릿용(DIP V6). */
    dateBasis?: 'CREATED' | 'EVENT';
  }): Promise<PageResponse<BoardPost>> {
    return this.executeGenerated(getPostsOperation, {
      path: { bbsId },
      query: params,
    }) as Promise<PageResponse<BoardPost>>;
  }

  /**
   * 게시글 목록·상세 화면용 게시판 메타(2026-09-26 DIP V5). 인증 사용자용이며 커뮤니티 귀속 게시판은
   * 회원만 받는다. 종전 화면은 관리자 API(BBS_MST_READ)로 읽어 일반 사용자에게 제목·템플릿이 비었다.
   */
  async getBoardMeta(bbsId: string, config?: AxiosRequestConfig): Promise<BoardMeta> {
    return this.executeGenerated(getBoardMetaOperation, {
      path: { bbsId },
      config,
    });
  }

  /*
    [2026-09-07] getPost·createPost·updatePost·deletePost 를 제거했다.

    넷 다 호출부가 0 이었고(축 2 실측), 같은 일을 하는 경로가 이미 정본이다 —
      · 상세 조회: BoardDetailServer 가 knowledgeService·boardAdminService 로 가져온다.
      · 등록·수정: boardActions.saveBoardArticle (DEC-OPS-044 로 첨부 multipart 를 포함한 정본 경로).
      · 삭제: boardActions.deleteBoardArticle.
    남긴 셋(searchPosts·getPosts·likePost)은 화면이 실제로 부른다.
  */
  /**
   * Q&A 질문을 해결됨으로 표시한다(2026-09-25 DIP I3). 작성자·전체 수정 권한자만 할 수 있고 서버가 판정한다.
   */
  async markQuestionSolved(bbsId: string, pstSn: number): Promise<void> {
    await this.executeGenerated(markQuestionSolvedOperation, {
      path: { bbsId, pstSn },
    });
  }

  async likePost(bbsId: string, pstSn: number): Promise<number> {
    // ApiService.patch가 이미 ApiResponse.data(=새 추천수)를 추출해 반환하므로 추가 .data 접근 금지(과거 undefined 반환 버그).
    return this.executeGenerated(likePostOperation, {
      path: { bbsId, pstSn },
    });
  }
}

export const boardUserService = new BoardUserService();
