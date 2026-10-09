/*
 * 프로젝트 이름 규칙(설계서 14.2 INVALID_NAME). 해석기·서버 요청 검증·화면이 같은 규칙을 쓴다.
 * 화면 사본(tools/project-composer/public/name-rule.js)은 브라우저가 불러오는 파일이라 따로 두며, 시험이 이 파일과
 * 상수·판정·문장이 같은지 대조한다.
 */
export const PROJECT_NAME_MAX = 63;
export const PROJECT_NAME_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
// Windows 가 장치 이름으로 예약한 이름. 생성기는 이 이름으로 파일(선택 정보 `<이름>.recipe.json` 등)을 만든다.
export const RESERVED_NAMES = Object.freeze(['con', 'prn', 'aux', 'nul',
  ...Array.from({ length: 10 }, (_, index) => `com${index}`), ...Array.from({ length: 10 }, (_, index) => `lpt${index}`)]);
export const NAME_RULE_MESSAGE = '프로젝트 이름은 영문 소문자로 시작하고, 영문 소문자·숫자와 그 사이의 하이픈만 쓸 수 있으며 최대 63자입니다. con·nul·com1 같은 Windows 예약 이름은 쓸 수 없습니다.';

export function projectNameIsValid(name) {
  return typeof name === 'string' && name.length <= PROJECT_NAME_MAX && PROJECT_NAME_PATTERN.test(name) && !RESERVED_NAMES.includes(name);
}
