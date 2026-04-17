import { UserService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';

export interface FAQ {
  faqId: string;
  qestnSj: string;
  qestnCn: string;
  answerCn: string;
  inqireCo: number;
  lastUpdusrPnttm: string;
}

export interface QNA {
  qaId: string;
  qestnSj: string;
  qestnCn: string;
  answerCn?: string;
  writngPassword?: string;
  wrterNm: string;
  writngDe: string;
  qnaProcessSttusCode: string; // 1: 접수, 2: 처리중, 3: 답변완료
}

/**
 * 도움말 센터 서비스(User)
 * - Q&A, FAQ 기능을 통합 게시판(BBS) 엔진으로 연결
 */
class HelpUserService extends UserService {
  constructor() {
    super('/boards');
  }

  /** FAQ 목록 조회 (전용 ID: BBSMSTR_BBBBBBBBBBBB) */
  async getFaqs(params: { keyword?: string; page?: number; size?: number }, config?: AxiosRequestConfig): Promise<PageResponse<FAQ>> {
    return this.get<PageResponse<FAQ>>('/BBSMSTR_BBBBBBBBBBBB', { 
      ...config, 
      params: {
        ...params,
        searchWrd: params.keyword
      }
    });
  }

  /** Q&A 목록 조회 (페이징) */
  async getQnas(params: { page?: number; size?: number; keyword?: string }, config?: AxiosRequestConfig): Promise<PageResponse<QNA>> {
    return this.get<PageResponse<QNA>>('/BBSMSTR_DDDDDDDDDDDD', {
      ...config,
      params: {
        ...params,
        searchWrd: params?.keyword || ''
      }
    });
  }

  /** Q&A 등록 */
  async createQna(data: Partial<QNA>, config?: AxiosRequestConfig): Promise<void> {
    const boardData = {
      bbsId: 'BBSMSTR_DDDDDDDDDDDD',
      nttSj: data.qestnSj,
      nttCn: data.qestnCn,
      password: data.writngPassword,
      ntcrNm: data.wrterNm
    };
    return this.post<void>('/posts', boardData, config);
  }
}

export const helpUserService = new HelpUserService();
