/*
 * 생성기 서버의 응답 모양 검사(공용). 엔진·브라우저에서 온 값은 이 검사를 지나야 응답에 실린다.
 * 요청 처리(project-composer-server.mjs)와 생성 작업 보기(project-composer-server-job.mjs)가 같이 쓴다.
 */
import { MENUS_REFRESH_COMMAND } from './project-composer-errors.mjs';

export const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
export const keys = (value, allowed) => plain(value) && Object.keys(value).every(key => allowed.includes(key));
export const identifier = value => typeof value === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(value);
export const line = (value, limit) => typeof value === 'string' && value.length > 0 && value.length <= limit && !/[\r\n\0]/.test(value);
export const count = value => Number.isSafeInteger(value) && value >= 0;
// 빈 칸 없는 배열만 받는다(every 는 빈 칸을 건너뛰고, 빈 칸은 JSON 에서 null 이 된다).
export const dense = value => Array.isArray(value) && Object.keys(value).length === value.length;
// 저장소 기준 경로만 받는다. 절대 경로·상위 폴더·역슬래시 경로는 이 컴퓨터의 폴더 이름을 흘릴 수 있다.
export const repositoryPath = value => line(value, 500) && !/^(?:[A-Za-z]:|[\\/])/.test(value) && !value.includes('\\') && !value.split('/').includes('..');
export const files = value => dense(value) && value.every(repositoryPath);
// 투영 오류 문장의 안전망: 엔진이 저장소 기준으로 바꾸지 못한 절대 경로를 가린다.
export const ABSOLUTE_PATH = /(?:[A-Za-z]:[\\/]|\\\\|\/(?:Users|home|root|tmp|var|private|mnt|opt|srv|Volumes)\/)[^\s'"`]*/g;

// 도구별 문장. 생성기는 시작할 때의 PATH 를 쓰므로 설치 뒤에는 생성기를 다시 시작해야 한다.
export const TOOL_MESSAGES = Object.freeze({
  git: 'Git 을 실행하지 못했습니다. Git 을 설치하거나 PATH 를 확인한 뒤 생성기를 다시 시작해 주세요.',
  docker: 'Docker 를 실행하지 못했습니다. Docker 엔진을 시작하거나 설치하고, Linux 컨테이너 모드인지 확인한 뒤 다시 점검해 주세요.',
});
// 도구 이름은 문자열이고 알려진 것이어야 한다(문자열로 바뀌는 객체·배열이 그대로 실려 나가지 않게).
export const knownTool = tool => typeof tool === 'string' && Object.hasOwn(TOOL_MESSAGES, tool);
/** 엔진 오류의 세부 정보는 코드마다 정해진 것만 다시 걸러 넘긴다. 엔진의 오류 문장은 보내지 않는다. */
export function safeDetails(error) {
  const details = plain(error.details) ? error.details : {};
  if (error.code === 'CATALOG_DRIFT') {
    // 로더가 첫 위반에서 멈추므로 위반은 한 건이다. 한 줄·300자로 줄이고 이 컴퓨터의 절대 경로를 가린다.
    const violation = Array.isArray(details.violations) ? details.violations[0] : undefined;
    const shown = typeof violation === 'string' ? violation.replace(/[\r\n\0]+/g, ' ').replace(ABSOLUTE_PATH, '<로컬 경로>').trim().slice(0, 300) : '';
    return shown ? { violations: [shown] } : {};
  }
  // 명령은 엔진 값이 아니라 서버 상수다. 생성기 서버는 이 명령을 실행하지 않는다.
  if (error.code === 'MENU_SNAPSHOT_STALE') return { command: MENUS_REFRESH_COMMAND };
  if (error.code === 'TOOL_UNAVAILABLE') return knownTool(details.tool) ? { tool: details.tool } : {};
  return {};
}
