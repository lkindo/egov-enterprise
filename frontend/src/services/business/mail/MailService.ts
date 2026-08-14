import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import type { components } from '@/types/generated-api';

/**
 * 발신 메일 DTO — 백엔드 `SentMailDto` 의 생성 타입을 SSOT 로 삼는다.
 * [FE 헌법] `generated-api.d.ts` 가 API 계약의 SSOT 이며, 로컬 인터페이스 재선언은 금지한다.
 * (과거 로컬 재선언이 서버에 존재하지 않는 `crtDt?` 를 옵셔널로 들고 있어
 *  발송일시가 전건 공백으로 렌더되는 드리프트를 타입 게이트가 은폐했다. 실제 필드는 `sndngDe` 다.)
 */
type SentMailDto = components['schemas']['SentMailDto'];

/** 화면이 항상 기대하는 식별/표시 필드를 필수로 좁힌 발신 메일 타입. */
export type SentMail = SentMailDto &
  Required<Pick<SentMailDto, 'emlDsptchSn' | 'sj' | 'recptnPerson' | 'sndngResultCode' | 'sndngDe'>>;

/**
 * 메일 발송 결과 코드 — 백엔드 `MailService`/`MailAsyncProcessor` 가 기록하는 값과 1:1 대응한다.
 * 임의 값('1' 등)으로 판정하지 말 것.
 */
export const MAIL_SEND_RESULT = {
  /** 발송 성공 (`MailAsyncProcessor.markResult(id, "S")`) */
  SUCCESS: 'S',
  /** 발송 실패 (`MailAsyncProcessor.markResult(id, "F")`) */
  FAILURE: 'F',
  /** 발송 대기/진행중 (`MailService` 최초 저장 시 `dsptchRsltCd("P")`) */
  PENDING: 'P',
} as const;

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
  async getSentMail(emlDsptchSn: number) {
    const response = await this.get<SentMail>(`/${emlDsptchSn}`);
    return response;
  }

  /**
   * 메일 발송
   */
  async sendMail(mailData: Partial<SentMail>) {
    const response = await this.post<number>('', mailData);
    return response;
  }

  /**
   * 메일 삭제
   */
  async deleteMail(emlDsptchSn: number) {
    const response = await this.delete<void>(`/${emlDsptchSn}`);
    return response;
  }
}

export const mailService = new MailService();
