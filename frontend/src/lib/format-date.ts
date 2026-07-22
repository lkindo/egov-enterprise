/**
 * 날짜 표기 단일 관문 (SSOT)
 *
 * 이 프로젝트의 `*_ymd` 계열 물리 컬럼은 모두 `character varying(8)` 이고,
 * 대응 DTO 도 `@Size(max = 8)` 이다(예: tb_onln_poll_manage.poll_bgng_ymd,
 * OnlinePollManageDto.pollBgngYmd). 즉 **저장/전송 포맷은 'yyyyMMdd' 8자**이며,
 * 'yyyy-MM-dd'(10자)를 보내면 컨트롤러 @Valid 에서 100% 400 이 난다.
 *
 * 반대로 화면 표시와 `<input type="date">` 는 'yyyy-MM-dd' 를 쓴다.
 * 두 표기의 변환을 화면마다 재구현하면(과거 실제로 그랬다) 드리프트가 재발하므로
 * 여기 한 곳에 모은다.
 *
 * 모든 변환은 **로컬 타임존** 기준이다. `toISOString().slice(0,10)` 같은 UTC 절단은
 * KST 자정 직후 하루가 밀리므로 쓰지 않는다.
 */

/** 저장 포맷: 8자리 숫자 'yyyyMMdd' */
export const STORAGE_YMD_PATTERN = /^\d{8}$/;
/** 표시/`<input type="date">` 포맷: 'yyyy-MM-dd' */
const DISPLAY_YMD_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 값이 저장 포맷('yyyyMMdd')이고 **달력상 실재하는 날짜**인지 검사한다.
 * 8자리 숫자여도 '20260231' 처럼 존재하지 않는 날짜면 false 다.
 *
 * 라이브 데이터에는 과거 10자 전송이 varchar(8) 에 잘려 들어간 손상 값
 * (예: '2026-05-')이 남아 있다. 그런 값은 여기서 false 로 걸러진다.
 */
export function isStorageYmd(value: string | null | undefined): value is string {
  if (!value || !STORAGE_YMD_PATTERN.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/** Date → 저장 포맷 'yyyyMMdd' (로컬 타임존 기준) */
export function toStorageYmd(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/** 오늘 날짜를 저장 포맷 'yyyyMMdd' 로 반환한다(로컬 타임존). */
export function todayStorageYmd(now: Date = new Date()): string {
  return toStorageYmd(now);
}

/**
 * 저장 포맷 'yyyyMMdd' → Date(로컬 자정). 손상/미상 값이면 null.
 * 문자열 비교로 충분한 곳에서는 굳이 Date 로 되돌리지 않는다(§ isPollActive 참고).
 */
export function parseStorageYmd(value: string | null | undefined): Date | null {
  if (!isStorageYmd(value)) return null;
  return new Date(
    Number(value.slice(0, 4)),
    Number(value.slice(4, 6)) - 1,
    Number(value.slice(6, 8))
  );
}

/**
 * 저장 값 → 표시 문자열.
 * - 'yyyyMMdd'  → 'yyyy-MM-dd'
 * - 'yyyy-MM-dd'(과거 형식으로 이미 저장된 값) → 그대로
 * - 그 외(빈 값, '2026-05-' 같은 잘린 손상 값) → `fallback`
 *
 * @param separator 구분자. 목록에서 'yyyy.MM.dd' 로 쓰고 싶으면 '.' 을 넘긴다.
 */
export function toDisplayYmd(
  value: string | null | undefined,
  fallback = '-',
  separator = '-'
): string {
  if (!value) return fallback;
  // isStorageYmd 는 타입 가드라, 좁혀진 value 를 else 분기에서 그대로 쓰면 never 가 된다.
  // 표시 변환은 원문 문자열을 그대로 다뤄야 하므로 별도 변수로 받는다.
  // 이미 표시형(yyyy-MM-dd)인 값을 먼저 처리한다. 타입 가드(isStorageYmd)를 앞에 두면
  // 그 뒤 분기에서 값이 never 로 좁혀져 문자열 연산을 쓸 수 없다.
  const text = String(value);
  if (DISPLAY_YMD_PATTERN.test(text)) {
    return separator === '-' ? text : text.replace(/-/g, separator);
  }
  if (isStorageYmd(text)) {
    return `${text.slice(0, 4)}${separator}${text.slice(4, 6)}${separator}${text.slice(6, 8)}`;
  }
  return fallback;
}

/**
 * 저장 값 → `<input type="date">` 의 value('yyyy-MM-dd').
 * 손상 값이면 빈 문자열(= 미입력)로 만들어 브라우저 경고를 피한다.
 */
export function toDateInputValue(value: string | null | undefined): string {
  if (!value) return '';
  if (isStorageYmd(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }
  if (DISPLAY_YMD_PATTERN.test(value)) return value;
  return '';
}

/**
 * `<input type="date">` 의 value('yyyy-MM-dd') → 저장 포맷 'yyyyMMdd'.
 * 비었거나 형식이 어긋나면 빈 문자열을 반환한다(임의 보정 금지).
 */
export function fromDateInputValue(value: string | null | undefined): string {
  if (!value) return '';
  if (!DISPLAY_YMD_PATTERN.test(value)) return '';
  const compact = value.replace(/-/g, '');
  return isStorageYmd(compact) ? compact : '';
}
