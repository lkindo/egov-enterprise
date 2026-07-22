import { AdminService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';
import type { components } from '@/types/generated-api';

/**
 * 감사 로그 DTO — `/logs/system` 이 반환하는 백엔드 `SysLogDto` 그 자체다.
 * [FE 헌법] `generated-api.d.ts` 가 API 계약의 SSOT 이며, 로컬 인터페이스 재선언은 금지한다.
 * (과거 로컬 `AuditLog { requstId, occrrncDe, processSeCode, rqesterId ... }` 재선언이
 *  실제 계약 `{ dmndId, ocrnYmd, prcsSeCd, dmndUserId }` 와 불일치하여
 *  타임라인 필드 전량 공백 + `undefined === undefined` 로 전 카드가 선택 강조되는 결함을 낳았다.)
 */
export type AuditLog = components['schemas']['SysLogDto'];

/**
 * 감사 로그 관리 서비스 (Admin)
 */
class AuditAdminService extends AdminService {
  constructor() {
    super('/logs/system');
  }

  /**
   * 감사 로그 목록 조회
   */
  async getAuditLogs(params: { page?: number; size?: number; keyword?: string }, config?: AxiosRequestConfig): Promise<PageResponse<AuditLog>> {
    return this.get<PageResponse<AuditLog>>('', { ...config, params });
  }
}

export const auditAdminService = new AuditAdminService();
