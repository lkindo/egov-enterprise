import type { AxiosRequestConfig } from 'axios';
import { ApiService } from '@/services/core/ApiService';
import type { GeneratedOperationRequest } from '@/types/generated-operations';
import { dispatchNotificationsOperation } from '@/types/generated-operations';

/** 관리자 알림 발송 입력 — 생성 계약(NotificationDispatchRequest)을 단일 원본으로 쓴다. */
export type NotificationDispatchInput = GeneratedOperationRequest<'dispatchNotifications'>;

/**
 * 관리자 알림 발송 서비스(2026-09-06 DEC-OPS-042, 감사 D09-05 후속).
 *
 * `POST /api/v1/notifications` 는 로그인한 본인의 알림을 만드는 개인 API 라 다른 사용자에게 보낼 수 없었다.
 * 이 서비스는 `/api/v1/admin/notifications/dispatch` 로 수신자(esntlId)·제목·내용을 보내고 서버가 수신자
 * 존재를 확인한 뒤 사람마다 알림 행을 만든다. 응답은 만든 건수다.
 */
class NotificationAdminService extends ApiService {
  constructor() {
    super('admin/notifications');
  }

  async dispatch(input: NotificationDispatchInput, config?: AxiosRequestConfig): Promise<number> {
    return this.executeGenerated(dispatchNotificationsOperation, { body: input, config }) as Promise<number>;
  }
}

export const notificationAdminService = new NotificationAdminService();
