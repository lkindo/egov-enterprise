import { z } from 'zod';

/**
 * 비밀번호 공용 규칙 — 백엔드 `PasswordPolicy`(business-core)와 같은 값이다(2026-09-25 DIP S5).
 *
 * 등록·본인 변경·관리자 초기화 화면이 모두 이 한 곳을 쓴다. 종전에는 화면 공용 스키마가 특수문자
 * `!@#$%^*+=-` 를, 서버 등록 규칙이 `@$!%*?&` 를 요구해 화면이 받아 준 `#` 포함 비밀번호를 서버가 거부했고,
 * 본인 변경·관리자 초기화 화면은 길이만 봤다. 값이 서버와 같은지는 생성 zod 와 대조하는 계약 테스트가 지킨다.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;

/** 영문·숫자·특수문자 각 1자 이상, 공백 없는 출력 가능 ASCII 8~64자. 서버 정규식 원문과 같다. */
export const PASSWORD_PATTERN_SOURCE = '^(?=.*[A-Za-z])(?=.*\\d)(?=.*[!-/:-@\\[-`{-~])[!-~]{8,64}$';

export const PASSWORD_RULE_HELP = '8~64자, 영문·숫자·특수문자를 각각 1자 이상 포함(공백 불가)';

const LENGTH_MESSAGE = '비밀번호는 8~64자여야 합니다.';
const PATTERN_MESSAGE = '비밀번호는 영문·숫자·특수문자를 각각 1자 이상 포함해야 하며 공백은 쓸 수 없습니다.';

/** 새 비밀번호 입력 스키마. 비밀번호는 공백도 문자이므로 trim 하지 않는다. */
export function passwordRuleSchema() {
  return z.string()
    .min(PASSWORD_MIN_LENGTH, LENGTH_MESSAGE)
    .max(PASSWORD_MAX_LENGTH, LENGTH_MESSAGE)
    .regex(new RegExp(PASSWORD_PATTERN_SOURCE), PATTERN_MESSAGE);
}
