import { AdminService } from '@/services/core/ApiService';
import type { components } from '@/types/generated-api';
import { scanOperation } from '@/types/generated-operations';

/**
 * 첨부 정합성 점검 결과.
 *
 * [2026-08-29] 종전에는 같은 모양을 **여기서 다시 선언**했다. 백엔드가 필드를 늘려도 이
 * 인터페이스는 모르므로 화면이 새 값을 읽을 수 없고, 반대로 백엔드가 필드를 없애도 타입은
 * 조용히 통과한다. FE 헌법이 금지하는 로컬 재선언이며, 실제로 역방향 census 를 추가할 때
 * 이 파일이 컴파일 오류의 원인이 됐다. 생성 타입을 SSOT 로 되돌린다.
 */
export type AttachmentIntegrityReport = components['schemas']['AttachmentIntegrityReport'];

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
    return this.executeGenerated(scanOperation, {});
  }
}

export const attachmentIntegrityService = new AttachmentIntegrityAdminService();
