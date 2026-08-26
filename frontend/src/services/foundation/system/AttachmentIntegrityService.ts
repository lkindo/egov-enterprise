import { AdminService } from '@/services/core/ApiService';

/** 첨부 정합성 점검 결과. 백엔드 `AttachmentIntegrityReport` 와 같은 모양이다. */
export interface AttachmentIntegrityReport {
  /** 확인한 첨부 레코드 수 */
  checked: number;
  /** 저장소에 실물이 없는 레코드 수 — 0 이 아니면 DB↔저장소가 어긋난 상태다 */
  missing: number;
  /** 조치 대상 예시(저장 경로 단위). 전체가 아니라 상한까지만 담긴다 */
  samples: string[];
}

/**
 * 첨부 정합성 진단.
 *
 * ⚠ 이 점검은 첨부 레코드를 <b>전량</b> 훑는다. 주기 조회로 걸지 않고 관리자가 누를 때만 돈다 —
 * 배경에서 30초마다 저장소를 두드리면 진단이 부하가 된다.
 */
class AttachmentIntegrityAdminService extends AdminService {
  constructor() {
    super('integrity', 'files');
  }

  async scan(): Promise<AttachmentIntegrityReport> {
    return this.get<AttachmentIntegrityReport>();
  }
}

export const attachmentIntegrityService = new AttachmentIntegrityAdminService();
