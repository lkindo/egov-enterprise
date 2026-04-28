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
        faqId: item.nttId,
        qestnSj: item.nttSj,
        qestnCn: item.nttSj,
        answerCn: item.nttCn,
        inqireCo: item.rdcnt || 0,
        lastUpdusrPnttm: item.lastUpdusrPnttm || item.frstRegistPnttm
      }));
    }
    return response as PageResponse<FAQ>;
  }

  /** Q&A 목록 조회 (페이징) */
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
        qaId: item.nttId,
        qestnSj: item.nttSj,
        qestnCn: item.nttCn,
        answerCn: item.answerCn || item.replyCn || '',
        wrterNm: item.ntcrNm || item.frstRegisterNm,
        writngDe: item.frstRegistPnttm,
        qnaProcessSttusCode: item.replyLc && item.replyLc > 0 ? '3' : '1' 
      }));
    }
    return response as PageResponse<QNA>;
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
