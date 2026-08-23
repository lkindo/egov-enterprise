import { UserService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import type { components } from '@/types/generated-api';
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
  qnaProcessSttusCode: string; // 1: 접수, 2: 처리중, 3: 답변완료
}

/**
 * 도움말 데이터 서비스 (User)
 * - Q&A, FAQ 기능을 통합 게시판(BBS) 엔진으로 연결
 */
class HelpUserService extends UserService {
  constructor() {
    super('/boards');
  }

  /** FAQ 목록 조회 (전용 ID: BBSMSTR_AAAAAAAAAAAA) */
  async getFaqs(params: { keyword?: string; page?: number; size?: number }, config?: AxiosRequestConfig): Promise<PageResponse<FAQ>> {
    const response = await this.get<PageResponse<BoardFaqListItem>>('/public-faqs', {
      ...config,
      params: {
        ...params,
      }
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
      return { ...response, list };
    }
    return { list: [], total: 0, totalPage: 0, page: 0, size: 0 } as unknown as PageResponse<FAQ>;
  }

  /** FAQ 공개 상세 조회. 목록 projection에 없는 답변 본문을 펼침 시에만 가져온다. */
  async getFaqDetail(faqId: string, config?: AxiosRequestConfig): Promise<FAQDetail> {
    const canonicalFaqId = canonicalPositiveInteger(faqId);
    if (!canonicalFaqId) throw new Error('유효하지 않은 FAQ 식별자입니다.');

    const item = await this.get<unknown>(
      `/public-faqs/${canonicalFaqId}`,
      config,
    );

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

  /** Q&A 목록 조회 (페이지) */
  async getQnas(params: { page?: number; size?: number; keyword?: string }, config?: AxiosRequestConfig): Promise<PageResponse<QNA>> {
    const response = await this.get<PageResponse<any>>(`/${QNA_BOARD_ID}`, {
      ...config,
      params: {
        ...params,
        searchWrd: params?.keyword || ''
      }
    });

    // Map unified board fields to QNA interface
    if (response && response.list) {
      response.list = response.list.map((item: any) => ({
        qaId: item.pstSn,
        qstnTtl: item.pstTtl,
        qstnCn: item.pstCn,
        ansCn: item.pstCn || '',
        wrterNm: item.userNm || item.userId,
        writngDe: item.crtDt,
        qnaProcessSttusCode: item.ansLv && item.ansLv > 0 ? '3' : '1'
      }));
      return response as PageResponse<QNA>;
    }
    return { list: [], total: 0, totalPage: 0, page: 0, size: 0 } as unknown as PageResponse<QNA>;
  }

  /** Q&A 등록 */
  async createQna(data: Partial<QNA>, config?: AxiosRequestConfig): Promise<void> {
    const boardData = {
      bbsId: QNA_BOARD_ID,
      pstTtl: data.qstnTtl,
      pstCn: data.qstnCn,
      pswd: data.writngPassword,
      userNm: data.wrterNm
    };
    return this.post<void>('/posts', boardData, config);
  }
}

const SEMANTIC_BREAK_ELEMENTS = new Set([
  'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'DIV', 'DL', 'DT', 'DD',
  'FIGCAPTION', 'FIGURE', 'FOOTER', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'HEADER', 'HR', 'LI', 'MAIN', 'NAV', 'OL', 'P', 'PRE', 'SECTION', 'TABLE',
  'TBODY', 'TD', 'TFOOT', 'TH', 'THEAD', 'TR', 'UL',
]);

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

/** Rich-text FAQ 본문을 실행 가능한 markup이 없는 읽기용 평문으로 변환한다. */
export function htmlToSemanticPlainText(html: string): string {
  if (!html) return '';

  if (typeof DOMParser === 'undefined') {
    return normalizePlainText(
      decodeHtmlEntities(
        html
          .replace(/<(script|style|template|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/?(?:address|article|aside|blockquote|div|dl|dt|dd|figcaption|figure|footer|h[1-6]|header|hr|li|main|nav|ol|p|pre|section|table|tbody|td|tfoot|th|thead|tr|ul)\b[^>]*>/gi, '\n')
          .replace(/<[^>]*>/g, ''),
      ),
    );
  }

  const documentNode = new DOMParser().parseFromString(html, 'text/html');
  documentNode.querySelectorAll('script, style, template, noscript').forEach((node) => node.remove());
  const fragments: string[] = [];

  const collectText = (node: globalThis.Node) => {
    if (node.nodeType === 3) {
      fragments.push(node.textContent ?? '');
      return;
    }
    if (node.nodeType !== 1) return;

    const isBreak = node.nodeName === 'BR';
    const isSemanticBoundary = SEMANTIC_BREAK_ELEMENTS.has(node.nodeName);
    if (isBreak || isSemanticBoundary) fragments.push('\n');
    if (!isBreak) node.childNodes.forEach(collectText);
    if (isSemanticBoundary) fragments.push('\n');
  };

  documentNode.body.childNodes.forEach(collectText);
  return normalizePlainText(fragments.join(''));
}

function decodeHtmlEntities(value: string): string {
  const namedEntities: Record<string, string> = {
    amp: '&', apos: "'", gt: '>', lt: '<', nbsp: ' ', quot: '"',
  };

  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => safeCodePoint(code, 16))
    .replace(/&#(\d+);/g, (_, code: string) => safeCodePoint(code, 10))
    .replace(/&([a-z]+);/gi, (entity, name: string) => namedEntities[name.toLowerCase()] ?? entity);
}

function safeCodePoint(code: string, radix: number): string {
  const codePoint = Number.parseInt(code, radix);
  return Number.isSafeInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
    ? String.fromCodePoint(codePoint)
    : '';
}

function normalizePlainText(value: string): string {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[\t ]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

export const helpUserService = new HelpUserService();
