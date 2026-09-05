import { ApiService } from '@/services/core/ApiService';
import type { components } from '@/types/generated-api';
import {
  createOperation,
  deleteOperation,
  getAverageOperation,
  getListOperation,
} from '@/types/generated-operations';

/** 게시글 만족도 DTO — 백엔드 `SatisfactionDto` 의 생성 타입을 SSOT 로 삼는다. */
export type Satisfaction = components['schemas']['SatisfactionDto'];

/** 평균은 평가가 없을 때 `average` 가 없으므로 실제 0점과 구분한다. */
export type SatisfactionAverage = components['schemas']['SatisfactionAverageResponse'];

class SatisfactionService extends ApiService {
  constructor() {
    super('/boards');
  }

  /** 사용 중(use_yn='Y') 만족도 목록. */
  list = async (bbsId: string, pstSn: number): Promise<Satisfaction[]> => {
    return this.executeGenerated(getListOperation, {
      path: { bbsId, pstSn },
    });
  };

  /** 평균 점수. 평가가 없으면 `average` 가 없다. */
  average = async (bbsId: string, pstSn: number): Promise<SatisfactionAverage> => {
    return this.executeGenerated(getAverageOperation, {
      path: { bbsId, pstSn },
    });
  };

  /** 등록 후 생성된 dgstfnSn을 반환한다. */
  create = async (bbsId: string, pstSn: number, body: Satisfaction): Promise<number> => {
    return this.executeGenerated(createOperation, {
      path: { bbsId, pstSn },
      body,
    });
  };

  /** 인증된 소유자 또는 관리자의 만족도를 논리 삭제한다. */
  remove = async (bbsId: string, pstSn: number, dgstfnSn: number): Promise<void> => {
    return this.executeGenerated(deleteOperation, {
      path: { bbsId, pstSn, dgstfnSn },
    });
  };
}

export const satisfactionService = new SatisfactionService();
