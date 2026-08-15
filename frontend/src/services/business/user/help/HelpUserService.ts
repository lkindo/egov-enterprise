import { UserService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';

export interface FAQ {
  faqId: string;
  qstnTtl: string;
  qstnCn: string;
  ansCn: string;
  inqCnt: number;
  mdfcnDt: string;
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
    const response = await this.get<PageResponse<any>>('/BBSMSTR_AAAAAAAAAAAA', { 
      ...config, 
      params: {
        ...params,
        searchWrd: params.keyword
      }
    });

    // Map unified board fields to FAQ interface
    if (response && response.list) {
      response.list = response.list.map((item: any) => ({
        faqId: item.pstSn,
        qstnTtl: item.pstTtl,
        qstnCn: item.pstCn,
        ansCn: item.pstCn,
        inqCnt: item.inqCnt || 0,
        mdfcnDt: item.crtDt
      }));
      return response as PageResponse<FAQ>;
    }
    return { list: [], total: 0, totalPage: 0, page: 0, size: 0 } as unknown as PageResponse<FAQ>;
  }

  /** Q&A 목록 조회 (페이지) */
  async getQnas(params: { page?: number; size?: number; keyword?: string }, config?: AxiosRequestConfig): Promise<PageResponse<QNA>> {
    const response = await this.get<PageResponse<any>>('/BBSMSTR_DDDDDDDDDDDD', {
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
      bbsId: 'BBSMSTR_DDDDDDDDDDDD',
      pstTtl: data.qstnTtl,
      pstCn: data.qstnCn,
      pswd: data.writngPassword,
      userNm: data.wrterNm
    };
    return this.post<void>('/posts', boardData, config);
  }
}

export const helpUserService = new HelpUserService();
