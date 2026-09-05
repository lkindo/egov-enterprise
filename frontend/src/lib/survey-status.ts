/**
 * 설문(설문조사) 진행 상태 판정 단일 관문.
 *
 * 투표의 {@link ./poll-status} 와 같은 규칙을 쓴다 — 저장 포맷은 'yyyyMMdd' 8자(varchar(8))이고
 * 8자끼리는 사전식 비교가 시간순 비교와 같으므로 Date 로 바꾸지 않고 문자열로만 비교한다.
 *
 * [2026-09-05] 종전에는 설문 목록이 기간을 표시만 하고 상태를 구분하지 않았고, 응답 화면은
 * "하나 이상 골랐는가" 만 보고 제출을 열어 **종료된 설문에도 응답이 저장**됐다. 서버
 * ({@code SurveyResultService.assertWithinPeriod})와 같은 판정을 화면이 먼저 보여 준다.
 *
 * 투표와 다른 점: 설문의 시작일·종료일은 물리적으로 NULL 허용이다. 비어 있는 경계는 그쪽이 열린
 * 것으로 본다(시작일 없음 = 즉시, 종료일 없음 = 무기한). 값이 있는데 8자리가 아니면 판정 불가 —
 * 판정 불가를 개방으로 해석하지 않는다(서버도 같은 이유로 거부한다).
 */

import { isStorageYmd, todayStorageYmd } from '@/lib/format-date';

export type SurveyStatus = 'scheduled' | 'active' | 'closed' | 'unknown';

export const SURVEY_STATUS_LABEL: Record<SurveyStatus, string> = {
  scheduled: '예정',
  active: '진행중',
  closed: '종료',
  unknown: '알 수 없음',
};

export interface SurveyPeriod {
  srvyBgngYmd?: string | null;
  srvyEndYmd?: string | null;
}

function isBlank(value: string | null | undefined): boolean {
  return value === null || value === undefined || value.trim() === '';
}

/**
 * @param survey 시작일·종료일(둘 다 선택)
 * @param today  기준일('yyyyMMdd'). 생략하면 로컬 오늘.
 */
export function getSurveyStatus(survey: SurveyPeriod, today?: string): SurveyStatus {
  const bgng = survey?.srvyBgngYmd;
  const end = survey?.srvyEndYmd;
  const hasBgng = !isBlank(bgng);
  const hasEnd = !isBlank(end);
  if ((hasBgng && !isStorageYmd(bgng)) || (hasEnd && !isStorageYmd(end))) return 'unknown';

  const base = isStorageYmd(today) ? today : todayStorageYmd();
  if (hasBgng && base < (bgng as string)) return 'scheduled';
  if (hasEnd && base > (end as string)) return 'closed';
  return 'active'; // 시작일·종료일 당일 포함
}

/** 오늘 응답할 수 있는가. 판정 불가('unknown')는 닫힘이다. */
export function isSurveyActive(survey: SurveyPeriod, today?: string): boolean {
  return getSurveyStatus(survey, today) === 'active';
}

export function getSurveyStatusLabel(survey: SurveyPeriod, today?: string): string {
  return SURVEY_STATUS_LABEL[getSurveyStatus(survey, today)];
}

/** 'yyyyMMdd' → 'yyyy-MM-dd'. 8자가 아니면 원문을 돌려준다. */
export function displaySurveyYmd(value: string | null | undefined): string {
  if (!isStorageYmd(value)) return value ?? '';
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

/**
 * 응답 화면에 보일 기간 안내. 'active' 면 null(안내 불필요).
 */
export function describeSurveyAvailability(survey: SurveyPeriod, today?: string): string | null {
  switch (getSurveyStatus(survey, today)) {
    case 'scheduled':
      return `아직 시작되지 않은 설문입니다. ${displaySurveyYmd(survey.srvyBgngYmd)}부터 응답할 수 있습니다.`;
    case 'closed':
      return `이미 종료된 설문입니다. (${displaySurveyYmd(survey.srvyEndYmd)} 종료) 결과 통계만 볼 수 있습니다.`;
    case 'unknown':
      return '설문 기간 정보를 확인할 수 없어 응답할 수 없습니다. 관리자에게 문의해 주세요.';
    default:
      return null;
  }
}
