/**
 * 정책 열람 화면 — 없는 문서를 만들어 내지 않는다.
 *
 * ── 무엇이 틀려 있었나 ──────────────────────────────────────────────────────────
 * 1. **서버가 본문을 지어냈다.** `PolicyApiController.defaultPolicy` 가 등록된 정책이 없으면
 *    "본 시스템은 사용자의 개인정보를 소중히 다루며, 관련 법규를 준수합니다." 라는
 *    **개인정보 처리 방침**을 만들어 200 으로 돌려줬다. 신규 설치의 기본 상태가 "가짜 법적
 *    문서를 진짜처럼 게시" 였고, 관리자조차 편집 화면에서 그것이 저장된 본문인지 서버가 만든
 *    것인지 구분할 수 없었다. 서버 축은 `PolicyApiControllerTest` 가 404 로 고정한다.
 *
 * 2. **화면이 시행일을 지어냈다.** `최종 수정일: {new Date()}` — 정책을 언제 고쳤든 **항상
 *    오늘 날짜**가 찍혔다. 법적 효력을 갖는 문서에 근거 없는 시행일을 붙인 셈이다.
 *    실제 수정 시각은 서버 응답(SystemPolicy)에 없으므로, 만들어 내는 대신 표시하지 않는다.
 *
 * 이 계약은 소스를 직접 읽는다 — 두 결함 모두 "무엇을 렌더하지 않는가" 가 핵심이라
 * 렌더 결과만 보면 다음 사람이 같은 것을 다시 넣는 것을 막지 못한다.
 */

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..', '..');

const read = (relative: string) => fs.readFileSync(path.join(ROOT, relative), 'utf8');

/** 주석 안의 문자열을 세면 "주석만 남기면 통과"가 되어 계약이 무력해진다. */
const stripComments = (source: string) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ');

const page = stripComments(read('frontend/src/app/help/policies/[type]/page.tsx'));
const controller = read(
  'api-server/src/main/java/nuri/api/controller/foundation/controller/system/policy/PolicyApiController.java',
)
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\/\/.*$/gm, ' ');

describe('정책 열람 — 시행일을 지어내지 않는다', () => {
  it('오늘 날짜를 최종 수정일로 표시하지 않는다', () => {
    expect(page).not.toContain('최종 수정일');
    expect(page).not.toContain('new Date()');
  });
});

describe('정책 열람 — 미등록을 본문으로 위장하지 않는다', () => {
  it('서버가 기본 본문을 만들어 내지 않는다', () => {
    // 이 문자열들이 서버 소스에 다시 나타나면 창작 폴백이 되살아난 것이다.
    expect(controller).not.toContain('defaultPolicy');
    expect(controller).not.toContain('개인정보를 소중히 다루며');
    expect(controller).not.toContain('저작권 보호 정책');
    expect(controller).not.toContain('준비 중인 정책 페이지입니다');
    // 미등록은 404 다.
    expect(controller).toContain('RESOURCE_NOT_FOUND');
  });

  it('화면이 404 를 미등록으로 구분해 말한다', () => {
    expect(page).toContain('not-registered');
    expect(page).toContain('등록된 정책이 없습니다');
  });

  it('권한 벽을 일시적 장애로 위장하지 않는다', () => {
    // 403 은 기다려도 해소되지 않는다 — '잠시 후 다시 시도' 는 사용자를 새로고침 반복에 가둔다.
    expect(page).toContain('관리자만 열람할 수 있습니다');
    expect(page).not.toContain('잠시 후 다시 시도');
  });
});
