/**
 * 행사 모달 — 내용이 길어져도 제출 버튼에 도달할 수 있어야 한다.
 *
 * ── 무엇이 틀려 있었나 ──────────────────────────────────────────────────────────
 * `DialogContent` 가 높이 제한도 스크롤도 없이 `overflow-hidden` 만 갖고 있었다. 넘치는
 * 부분을 **잘라내기만** 하므로, 폼이 뷰포트보다 길어지면 `DialogFooter`(제출·취소)가 잘린
 * 영역으로 들어가 **물리적으로 누를 수 없다.**
 *
 * 담당자·준비사항 두 필드를 더하자 1280×720 에서 정확히 그 상태가 됐다. 사용자는 다 입력하고도
 * 저장할 방법이 없고, e2e 는 클릭이 영원히 대기하다 죽었다(PR #508 CI — 실패는 60초 뒤
 * `waitForResponse` 타임아웃으로 나타나 원인이 폼 검증인 것처럼 보였다. 실패 스크린샷에
 * 검증 오류가 하나도 없는데 POST 가 안 나간 것이 단서였다).
 *
 * jsdom 은 레이아웃을 계산하지 않아 "버튼이 화면 밖인가" 를 렌더로 검증할 수 없다. 그래서
 * **원인 조건**을 소스에서 고정한다 — 높이 경계 없는 `overflow-hidden` 을 쓰지 않는다.
 */

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.resolve(__dirname, '..', 'EventManagementClient.tsx'),
  'utf8',
);

/** `<DialogContent ... >` 여는 태그 하나를 통째로 집는다. */
const dialogContentTag = source.match(/<DialogContent[^>]*>/)?.[0] ?? '';

describe('행사 모달 도달 가능성', () => {
  it('DialogContent 를 실제로 쓴다 — 태그를 못 찾으면 이 계약이 vacuous 하다', () => {
    expect(dialogContentTag).not.toBe('');
  });

  it('내용이 넘칠 때 잘라내지 않고 스크롤한다', () => {
    // 잘라내기만 하면 푸터(제출 버튼)가 도달 불가가 된다.
    expect(dialogContentTag).not.toContain('overflow-hidden');
    expect(dialogContentTag).toMatch(/overflow-y-auto|overflow-auto|overflow-y-scroll/);
  });

  it('높이 경계를 둔다 — 경계가 없으면 스크롤이 생기지 않는다', () => {
    expect(dialogContentTag).toMatch(/max-h-\[[^\]]+\]|max-h-screen/);
  });

  it('제출 버튼이 폼 안에 있다 — 밖에 있으면 type=submit 이 아무 일도 하지 않는다', () => {
    const formStart = source.indexOf('<form onSubmit={handleSubmit}');
    const formEnd = source.indexOf('</form>', formStart);
    expect(formStart).toBeGreaterThan(-1);
    const formBody = source.slice(formStart, formEnd);
    expect(formBody).toContain('<DialogFooter');
    expect(formBody).toContain('type="submit"');
  });
});
