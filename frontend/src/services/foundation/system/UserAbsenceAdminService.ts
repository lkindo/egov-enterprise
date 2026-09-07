import { ApiService } from '@/services/core/ApiService';
import type { AxiosRequestConfig } from 'axios';
import type { components } from '@/types/generated-api';
import {
  getAbsenceOperation,
  getAbsencesOperation,
  updateAbsenceOperation,
} from '@/types/generated-operations';

/**
 * 사용자 부재(자리비움) 관리자 서비스.
 *
 * <p>[2026-09-07] 백엔드 3본은 완비돼 있었으나 호출부가 0 이라 `/admin/user/absences` 화면이
 * "부재 정보는 아직 이 화면에 연동되지 않았습니다" 라고 고지만 하고 있었다
 * (operation-consumer-census 의 `unwired` 부채 — DEC-OPS-048).
 *
 * <p>⚠ <b>키 축은 `esntlId` 다.</b> `tb_user_absn.user_id` 는 이름과 달리 로그인 ID 가 아니라
 * 사용자 PK 이며 FK 도 `tb_user_info(esntl_id)` 를 가리킨다(V2_14). loginId 로 맞추면 어떤 행도
 * 매칭되지 않은 채 조용히 "전원 정상" 으로 보인다 — 커뮤니티 멤버십에서 이미 확인된 함정이다.
 * 사용자 목록 projection 이 `esntlId` 를 싣고 허브의 선택 키도 같은 축이라 그대로 join 한다.
 */
export type UserAbsence = components['schemas']['UserAbsenceDto'];

/** 부재 여부 어휘. 물리 컬럼은 `varchar(1) NOT NULL` 이다. */
export const ABSENT = 'Y';
export const PRESENT = 'N';

class UserAbsenceAdminService extends ApiService {
  constructor() {
    super('/admin/system/user-absences');
  }

  /**
   * 부재 기록이 있는 사용자만 돌아온다 — 기록이 없는 사용자는 목록에 없으며 그것이 '정상' 이다.
   * 한 번 부재였다가 복귀한 사용자는 `userAbsnYn='N'` 행으로 남는다.
   */
  async getAbsences(config?: AxiosRequestConfig): Promise<UserAbsence[]> {
    const response = await this.executeGenerated(getAbsencesOperation, { config });
    if (!Array.isArray(response)) {
      throw new Error('부재 목록 응답이 배열 계약과 일치하지 않습니다.');
    }
    return response;
  }

  /** 기록이 없는 사용자도 404 가 아니라 `userAbsnYn='N'` 으로 돌아온다(서버 기본값). */
  async getAbsence(esntlId: string, config?: AxiosRequestConfig): Promise<UserAbsence> {
    return this.executeGenerated(getAbsenceOperation, { path: { emplyrId: esntlId }, config });
  }

  /** 업서트다 — 기록이 없던 사용자도 이 호출로 처음 행이 생긴다. 실존하지 않는 사용자는 서버가 404 로 막는다. */
  async updateAbsence(esntlId: string, userAbsnYn: string, config?: AxiosRequestConfig): Promise<void> {
    await this.executeGenerated(updateAbsenceOperation, {
      path: { emplyrId: esntlId },
      body: { userId: esntlId, userAbsnYn },
      config,
    });
  }
}

export const userAbsenceAdminService = new UserAbsenceAdminService();
