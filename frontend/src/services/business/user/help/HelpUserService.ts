import { htmlToSemanticPlainText } from '@/lib/html-to-text';
import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import type { components } from '@/types/generated-api';
import {
  createPostOperation,
  getPostsOperation,
  getPublicFaqDetailOperation,
  getPublicFaqsOperation,
  getPublicHpcmListOperation,
  getPublicManualsOperation,
} from '@/types/generated-operations';
import { AxiosRequestConfig } from 'axios';
import { HELP_FAQ_BOARD_ID, QNA_BOARD_ID } from '@/config/board-ids';

// help 축 FAQ는 공지 게시판(AAAA)으로 통합돼 있다 — board-ids SSOT의 별칭을 사용.
const FAQ_BOARD_ID = HELP_FAQ_BOARD_ID;

type BoardFaqListItem = components['schemas']['PublicFaqListItemResponse'];
type BoardFaqDetail = components['schemas']['PublicFaqDetailResponse'];

export interface FAQ {
  faqId: string;
  qstnTtl: string;
  inqCnt: number;
  mdfcnDt: string;
}

export interface FAQDetail extends FAQ {
  ansCn: string;
}

export interface QNA {
  qaId: string;
  qstnTtl: string;
  qstnCn: string;
  ansCn?: string;
  writngPassword?: string;
  wrterNm: string;
  writngDe: string;
  /**
   * 서버가 내려주는 Q&A 상태 코드.
   *
   * [2026-08-28] 종전에는 이 필드를 `ansLv > 0 ? '3' : '1'` 로 **지어냈다**. `ansLv` 는
   * 그 글 자신의 답글 깊이라, 질문 글은 답변이 달려도 영원히 '접수' 로 남고 답변 글 자체가
   * '답변완료' 로 보였다. 게시판 응답에는 실제 상태 컬럼(`qnaSttsCd`)이 이미 실려 온다
   * (BoardDto — 값 도메인 OPEN/SOLVED. 종전 등록 경로의 QA01 은 V2_116 이 OPEN 으로 맞췄다).
   */
  qnaSttsCd?: string;
  /** 비밀글 여부. 'Y' 면 작성자와 관리자만 열람한다(BoardPredicate). */
  scrtYn?: string;
}

/**
 * 도움말 센터의 읽기 전용 안내 한 건(2026-10-19). 관리 화면이 등록한 도움말(HPCM)과 온라인 매뉴얼을 같은 모양으로 보인다.
 * 서버의 공개용 응답은 등록자 ID 를 싣지 않는다 — 화면도 묻지 않는다.
 */
export interface HelpGuide {
  id: string;
  title: string;
  description: string;
  /** 온라인 매뉴얼의 리소스 경로(관리 화면이 적는 값). 도움말에는 없다. */
  resourcePath?: string;
}

type GuideQuery = { keyword?: string; page?: number; size?: number };

// 해결 상태 판정은 지식 허브(게시판 셸)와 함께 쓰므로 core 모듈에 둔다(허브 분해 H2). 도움말 화면은 이 이름으로 계속 쓴다.
export { isQnaSolved } from '@/lib/board/qna-status';

/**
 * 도움말 데이터 서비스 (User)
 * - Q&A, FAQ 기능을 통합 게시판(BBS) 엔진으로 연결
 */
class HelpUserService extends ApiService {
  /** FAQ 목록 조회 (전용 ID: BBSMSTR_AAAAAAAAAAAA) */
  async getFaqs(params: { keyword?: string; page?: number; size?: number }, config?: AxiosRequestConfig): Promise<PageResponse<FAQ>> {
    const response = await this.executeGenerated(getPublicFaqsOperation, {
      query: params,
      config,
    });

    // 목록 projection에는 본문(pstCn)이 없으며, 상세 내용은 펼침 시 별도 조회한다.
    if (response && response.list) {
      if (!response.list.every(isPublicFaqListItem)) {
        throw new Error('FAQ 목록 정보를 표시할 수 없습니다.');
      }
      const list = response.list.map((item) => ({
        faqId: String(item.pstSn),
        qstnTtl: item.pstTtl ?? '',
        inqCnt: item.inqCnt || 0,
        mdfcnDt: item.crtDt ?? '',
      }));
      return {
        list,
        total: response.total ?? 0,
        totalPage: response.totalPage ?? 0,
        page: response.page ?? 0,
        size: response.size ?? 0,
      };
    }
    return { list: [], total: 0, totalPage: 0, page: 0, size: 0 };
  }

  /** FAQ 공개 상세 조회. 목록 projection에 없는 답변 본문을 펼침 시에만 가져온다. */
  async getFaqDetail(faqId: string, config?: AxiosRequestConfig): Promise<FAQDetail> {
    const canonicalFaqId = canonicalPositiveInteger(faqId);
    if (!canonicalFaqId) throw new Error('유효하지 않은 FAQ 식별자입니다.');

    let item: BoardFaqDetail;
    try {
      item = await this.executeGenerated(getPublicFaqDetailOperation, {
        path: { pstSn: Number(canonicalFaqId) },
        config,
      });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('생성 API 응답')) {
        throw new Error('FAQ 상세 정보를 표시할 수 없습니다.');
      }
      throw error;
    }

    if (!isPublicFaqDetail(item, canonicalFaqId)) {
      throw new Error('FAQ 상세 정보를 표시할 수 없습니다.');
    }

    return {
      faqId: canonicalFaqId,
      qstnTtl: typeof item.pstTtl === 'string' ? item.pstTtl : '',
      ansCn: htmlToSemanticPlainText(typeof item.pstCn === 'string' ? item.pstCn : ''),
      inqCnt: Number(item.inqCnt) || 0,
      mdfcnDt: String(item.crtDt ?? ''),
    };
  }

  /**
   * 도움말(HPCM) 열람 목록. 로그인한 사용자 누구나 읽는다 — 관리 목록(HELP_READ)과 다른 연산이다. 순서는 서버가 정한다(제목 가나다순).
   */
  async getHelpGuides(params: GuideQuery, config?: AxiosRequestConfig): Promise<PageResponse<HelpGuide>> {
    const response = await this.executeGenerated(getPublicHpcmListOperation, { query: guideQuery(params), config });
    return guidePage(response, (response.list ?? []).map((item) => ({
      id: String(item.hlpSn),
      title: item.hlpDfn,
      description: item.hlpExpln ?? '',
    })));
  }

  /** 온라인 매뉴얼 열람 목록. 도움말 목록과 같은 인가·순서 규칙이다(매뉴얼 명 가나다순). */
  async getOnlineManuals(params: GuideQuery, config?: AxiosRequestConfig): Promise<PageResponse<HelpGuide>> {
    const response = await this.executeGenerated(getPublicManualsOperation, { query: guideQuery(params), config });
    return guidePage(response, (response.list ?? []).map((item) => ({
      id: String(item.onlnMnlSn),
      title: item.onlnMnlNm,
      description: item.onlnMnlExpln ?? '',
      ...(item.onlnMnlDfn ? { resourcePath: item.onlnMnlDfn } : {}),
    })));
  }

  /** Q&A 목록 조회 (페이지) */
  async getQnas(params: { page?: number; size?: number; keyword?: string }, config?: AxiosRequestConfig): Promise<PageResponse<QNA>> {
    const { keyword, ...pageQuery } = params;
    const response = await this.executeGenerated(getPostsOperation, {
      path: { bbsId: QNA_BOARD_ID },
      query: {
        ...pageQuery,
        searchWrd: keyword || '',
      },
      config,
    });
    const list = (response.list ?? []).map((item): QNA => {
      if (
        typeof item.pstSn !== 'number'
        || typeof item.userId !== 'string'
        || typeof item.useYn !== 'string'
      ) {
        throw new Error('Q&A 목록 정보를 표시할 수 없습니다.');
      }

      return {
        qaId: String(item.pstSn),
        qstnTtl: item.pstTtl ?? '',
        qstnCn: item.pstCn ?? '',
        ansCn: item.pstCn ?? '',
        wrterNm: item.userNm || item.userId,
        writngDe: item.crtDt ?? '',
        ...(item.qnaSttsCd == null ? {} : { qnaSttsCd: item.qnaSttsCd }),
        ...(item.scrtYn == null ? {} : { scrtYn: item.scrtYn }),
      };
    });

    return {
      list,
      total: response.total ?? 0,
      page: response.page ?? 0,
      size: response.size ?? 0,
      totalPage: response.totalPage ?? 0,
    };
  }

  /**
   * Q&A 등록.
   *
   * 화면이 '1:1 문의' 라고 부르는 이상 기본은 비밀글이어야 한다 — 그러지 않으면 이 게시판을
   * 여는 모든 로그인 사용자가 남의 문의를 읽는다(BoardPredicate 는 scrtYn='N' 을 전체 공개로
   * 본다). 서버가 열람 범위를 이 값으로 집행하므로 화면 문구가 아니라 이 필드가 실제 경계다.
   */
  async createQna(data: Partial<QNA>, config?: AxiosRequestConfig): Promise<void> {
    if (typeof data.qstnTtl !== 'string' || typeof data.qstnCn !== 'string') {
      throw new Error('Q&A 제목과 본문은 필수입니다.');
    }
    const boardData = {
      bbsId: QNA_BOARD_ID,
      pstTtl: data.qstnTtl,
      pstCn: data.qstnCn,
      pswd: data.writngPassword,
      scrtYn: 'Y',
    };
    await this.executeGenerated(createPostOperation, { body: boardData, config });
  }
}

/** 비어 있는 검색어는 보내지 않는다 — 서버는 없는 검색어를 전체로 본다. */
function guideQuery({ keyword, page, size }: GuideQuery): GuideQuery {
  return {
    ...(keyword ? { keyword } : {}),
    ...(page === undefined ? {} : { page }),
    ...(size === undefined ? {} : { size }),
  };
}

function guidePage(
  response: { total?: number; totalPage?: number; page?: number; size?: number },
  list: HelpGuide[],
): PageResponse<HelpGuide> {
  return {
    list,
    total: response.total ?? 0,
    totalPage: response.totalPage ?? 0,
    page: response.page ?? 0,
    size: response.size ?? 0,
  };
}

function canonicalPositiveInteger(value: unknown): string | null {
  const candidate = typeof value === 'number' ? String(value) : value;
  if (typeof candidate !== 'string' || !/^[1-9]\d*$/.test(candidate)) return null;

  const numericValue = Number(candidate);
  return Number.isSafeInteger(numericValue) && numericValue > 0 ? candidate : null;
}

function isPublicFaqDetail(
  item: unknown,
  requestedFaqId: string,
): item is BoardFaqDetail {
  if (typeof item !== 'object' || item === null || Array.isArray(item)) return false;
  const detail = item as Record<string, unknown>;

  return detail.bbsId === FAQ_BOARD_ID
    && detail.scrtYn === 'N'
    && detail.useYn === 'Y'
    && canonicalPositiveInteger(detail.pstSn) === requestedFaqId;
}

function isPublicFaqListItem(item: BoardFaqListItem): boolean {
  return item.bbsId === FAQ_BOARD_ID
    && item.scrtYn === 'N'
    && item.useYn === 'Y'
    && canonicalPositiveInteger(item.pstSn) !== null;
}

export const helpUserService = new HelpUserService();
