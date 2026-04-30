import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';

export interface SentMail {
  mssageId: string;
  sj: string;
  emailCn: string;
  dsptchPerson: string;
  recptnPerson: string;
  sndngResultCode: string;
  atchFileId?: string;
  createdDate?: string;
}

class MailService extends ApiService {
  constructor() {
    super('/mails');
  }

  /**
   * 발신 메일 목록 조회
   */
  async getSentMails(params?: {
    searchCondition?: string;
    searchKeyword?: string;
    page?: number;
    size?: number;
  }) {
    const response = await this.get<PageResponse<SentMail>>('', { params });
    return response;
  }

  /**
   * 발신 메일 상세 조회
   */
  async getSentMail(mssageId: string) {
    const response = await this.get<SentMail>(`/${mssageId}`);
    return response;
  }

  /**
   * 메일 발송
   */
  async sendMail(mailData: Partial<SentMail>) {
    const response = await this.post<string>('', mailData);
    return response;
  }

  /**
   * 메일 삭제
   */
  async deleteMail(mssageId: string) {
    const response = await this.delete<void>(`/${mssageId}`);
    return response;
  }
}

export const mailService = new MailService();
