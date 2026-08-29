import client from '@/lib/api/client';
import type { components } from '@/types/generated-api';

/**
 * 게시글 만족도 DTO — 백엔드 `SatisfactionDto` 의 생성 타입을 SSOT 로 삼는다.
 *
 * [FE 헌법] `generated-api.d.ts` 가 API 계약의 SSOT 이며 로컬 인터페이스 재선언은 금지한다.
 * (로그 도메인에서 수제 타입이 백엔드와 전면 불일치해 화면이 빈 컬럼을 그리던 사고가 있었다.)
 *
 * `pswd` 는 생성 스펙에 `writeOnly` 로 선언돼 있다 — 요청에만 싣고 응답에는 오지 않는다.
 */
export type Satisfaction = components['schemas']['SatisfactionDto'];

/**
 * 만족도 평균 응답. `average` 는 **선택 필드**다 — 평가가 하나도 없으면 서버가 값을 싣지 않는다.
 *
 * [2026-08-29] 종전에는 `{ average: number }` 로 선언하고 서버가 0 을 주었다. 그래서
 * "아무도 평가하지 않음" 과 "모두 최하점" 이 타입 수준에서도 구분되지 않았다.
 */
export type SatisfactionAverage = components['schemas']['SatisfactionAverageResponse'];

/** 만족도는 게시글에 종속된 자원이라 경로가 조회 범위를 강제한다. */
const base = (bbsId: string, pstSn: number) =>
  `/boards/${encodeURIComponent(bbsId)}/posts/${encodeURIComponent(pstSn)}/satisfactions`;

export const satisfactionService = {
  /** 사용 중(use_yn='Y') 만족도 목록. */
  list: (bbsId: string, pstSn: number): Promise<Satisfaction[]> =>
    client.get<Satisfaction[]>(base(bbsId, pstSn)),

  /** 평균 점수. **평가가 없으면 `average` 가 없다** — 0 과 구분해야 한다. */
  average: (bbsId: string, pstSn: number): Promise<SatisfactionAverage> =>
    client.get<SatisfactionAverage>(`${base(bbsId, pstSn)}/average`),

  /** 등록. 반환값은 생성된 dgstfnSn. */
  create: (bbsId: string, pstSn: number, body: Satisfaction): Promise<number> =>
    client.post<number>(base(bbsId, pstSn), body),

  /**
   * 삭제. `pswd` 는 익명 작성분의 소유 증명이다.
   * 로그인 작성분은 백엔드가 소유자/관리자로 판정하므로 생략해도 된다.
   */
  remove: (bbsId: string, pstSn: number, dgstfnSn: number, pswd?: string): Promise<void> =>
    client.delete<void>(`${base(bbsId, pstSn)}/${dgstfnSn}`, {
      params: pswd ? { pswd } : undefined,
    }),
};
