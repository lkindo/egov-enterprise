/*
 * 프로젝트 생성기 오류 코드(설계서 14.2, E4). 오류는 처음 생긴 자리에서 코드를 단다. 서버는 이 모듈의 ComposerError 만
 * 허용 목록으로 받아 상태·문장·행동을 정하고, 그 밖의 오류는 일반 문장으로 답한다. 판정은 메시지 문자열로 하지 않는다.
 * 이 모듈은 다른 생성기 모듈을 가져오지 않는다(메뉴 미리보기·해석기·서버가 모두 가져오므로 순환을 만들지 않는다).
 */
import { resolve } from 'node:path';

export class ComposerError extends Error {
  /** details 는 서버가 다시 거르는 원자료다. message 는 CLI·로그용 기술 문장이며 화면에 보내지 않는다. */
  constructor(code, details = {}, message = code) {
    super(message);
    this.name = 'ComposerError';
    this.code = code;
    this.details = details;
  }
}

/** 요청 응답으로 보낼 수 있는 코드. 문장·상태·행동은 서버 표가 정한다. */
export const REQUEST_ERROR_CODES = Object.freeze(['INVALID_NAME', 'INVALID_RECIPE', 'SOURCE_CHANGED', 'MENU_SNAPSHOT_STALE', 'CATALOG_DRIFT', 'TOOL_UNAVAILABLE']);
/**
 * 생성 작업 실패로 보낼 수 있는 코드(E4b). 엔진이 실패가 생긴 지점에서 판정해 단다. 서버는 이 목록 밖의 코드와
 * ComposerError 가 아닌 오류를 모두 일반 실패(GENERATION_FAILED)로 말한다. 작업 취소(CANCELLED)는 E6 에서 더한다.
 */
export const JOB_ERROR_CODES = Object.freeze(['SOURCE_CHANGED', 'TOOL_UNAVAILABLE', 'DB_NOT_READY', 'OUTPUT_CONFLICT', 'SOURCE_SURVIVAL',
  'VERIFY_FAILED', 'MENU_SNAPSHOT_STALE', 'CATALOG_DRIFT']);
/** 메뉴 미리보기 자료를 갱신하는 명령. 화면은 이 문자열만 보이고, 생성기 서버는 명령을 실행하지 않는다. */
export const MENUS_REFRESH_COMMAND = 'npm run project:menus:refresh';

const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/**
 * 오류 문장의 이 컴퓨터 절대 경로(사용자 폴더 이름)를 저장소 기준 경로로 바꾼다.
 * 구분자(\ 와 /, JSON 이 두 겹으로 쓴 \\ 포함)와 대소문자가 달라도 같은 루트로 본다.
 * replacement 는 루트 자리에 넣을 글자다(사용자 폴더는 '~' 로 바꿔 저장소 경로와 헷갈리지 않게 한다).
 */
export function withoutRoot(root, text, replacement = '.') {
  return [...new Set([root, resolve(root)])].reduce((value, form) => {
    const parts = form.split(/[\\/]+/).filter(Boolean).map(escapeRegExp);
    if (!parts.length) return value;
    // 경로 글자 바로 뒤에서 시작하는 일치는 저장소 안 경로의 일부다(루트가 /app 이면 frontend/src/app 의 /app). 바꾸지 않는다.
    // 드라이브만인 루트(E:\)는 뒤에 구분자가 와야 경로다('file:' 같은 글자는 경로가 아니다).
    const driveOnly = parts.length === 1 && /^[A-Za-z]:$/.test(parts[0]);
    return value.replace(new RegExp(`(?<![\\w.\\-])${/^[\\/]/.test(form) ? '[\\\\/]+' : ''}${parts.join('[\\\\/]+')}${driveOnly ? '(?=[\\\\/])' : ''}`, 'gi'), () => replacement);
  }, text);
}
/**
 * 선언(카탈로그·화면 문구·메뉴 투영·미배정 권한 안내) 적재가 실패한 원인을 분류한다.
 * 선언 모듈이 일부러 던진 실패(일반 Error)와, 선언이 가리키는 파일이 사라진 경우(ENOENT)만 CATALOG_DRIFT 다.
 * 런타임 결함(TypeError·ReferenceError·SyntaxError)과 그 밖의 시스템 오류는 그대로 돌려 내부 오류로 남긴다.
 */
export function classifyDeclarationFailure(error, root) {
  if (error instanceof ComposerError) return error;
  const drift = message => new ComposerError('CATALOG_DRIFT', { violations: [withoutRoot(root, String(message))] }, String(message));
  if (typeof error?.syscall === 'string') return error.code === 'ENOENT' ? drift(error.message) : error;
  if (error instanceof Error && Object.getPrototypeOf(error) === Error.prototype) return drift(error.message);
  return error;
}
