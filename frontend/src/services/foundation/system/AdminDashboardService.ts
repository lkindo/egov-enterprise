import type { AxiosRequestConfig } from 'axios';
import { executeGeneratedOperation } from '@/lib/api/generated-api-client';
import { adminOperationalSignalsOperation } from '@/types/generated-operations';
import { OperationalSignalsResponseSchema } from '@/types/generated-zod';
import { z } from 'zod';

/**
 * 관리자 홈(/admin)의 서버 집계(2026-10-20) — 운영 신호 요약 하나.
 *
 * 서버가 실패한 후속 작업 수·잠긴 계정 수·오늘 실패 요청 수를 DB 에서 세어 관측 시각과 함께 돌려준다. 보는 사람이 그 원천을 조회할
 * 권한(DWORK_READ·USER_READ·SYS_LOG_READ)이 없는 신호는 응답에 없다 — 화면은 받은 신호만 그린다. 건수 null 은 셀 수 없다는 뜻이다.
 */
export type OperationalSignals = z.output<typeof OperationalSignalsResponseSchema>;
export type OperationalSignal = OperationalSignals['signals'][number];
export type OperationalSignalKind = OperationalSignal['kind'];

export const adminDashboardService = {
  async getOperationalSignals(config?: AxiosRequestConfig): Promise<OperationalSignals> {
    return executeGeneratedOperation(adminOperationalSignalsOperation, { config });
  },
};
