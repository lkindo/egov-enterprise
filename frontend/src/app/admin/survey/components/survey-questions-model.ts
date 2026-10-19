import type { Survey, SurveyQuestion } from '@/types/business/survey';

/*
 * 문항·항목 관리 패널(SurveyQuestionsPanel)의 타입·상수. 2026-10-18 패널 분해 때 패널 파일 머리에서 옮겼다(동작 변경 없음).
 */

/*
  전체 치환(PUT) payload 타입. 서버가 이 필드들을 그대로 엔티티에 덮어쓰므로 하나라도 빠지면
  그 값이 null 이 된다 — 목록 행의 기존 값을 함께 실어 보내기 위한 명시적 계약이다.

  ⚠ **되돌려 싣는 필드는 optional 이다.** 목록 행의 값이 null 이면 `omitNulls` 가 그 키를
  떨어뜨리기 때문이다(요청 스키마가 null 을 거부한다 — omit-nulls.ts 의 docblock 참조).
  수제 `Survey`·`SurveyQuestion` 타입은 이 필드들을 non-null 로 선언하지만 **그 선언이 사실과
  다르다** — 그래서 TypeScript 는 이 결함을 한 번도 잡지 못했다.
*/
export type SurveyInfoUpdate = Pick<Survey, 'srvyTtl' | 'srvyTmpltSn'>
  & Partial<Pick<Survey, 'srvyPrps' | 'srvyWrtGdCn' | 'srvyBgngYmd' | 'srvyEndYmd' | 'srvyTrgt' | 'rlsYn'>>
  // [2026-10-18] 목록 행에서 읽은 낙관적 잠금 버전 — 다른 사람이 먼저 고쳤으면 서버가 409 로 거부한다.
  & { version?: number };
export type SurveyQuestionUpdate = Pick<SurveyQuestion, 'qstnCn'>
  & Partial<Pick<SurveyQuestion, 'qstnSn' | 'qstnTypeCd' | 'maxChcCnt'>>;
export type SurveyItemUpdate = { artclSn?: number; artclCn: string; etcAnsYn?: string };

/** '1' = 객관식. 그 외는 주관식으로 취급한다(백엔드 통계 DTO 와 같은 규약). */
export const MULTIPLE_CHOICE = '1';
export const PERIOD_FIELDS = ['srvyBgngYmd', 'srvyEndYmd'] as const;
export const EMPTY_PERIOD = { srvyBgngYmd: '', srvyEndYmd: '' };
export type SurveyPeriod = typeof EMPTY_PERIOD;

/** 패널의 설문지 선택기 목록 조회 키. 등록·수정·삭제·공개 전환·복제가 이 키를 무효화한다. */
export const SURVEYS_FOR_QUESTIONS_KEY = ['admin-surveys-for-questions'];
