/**
 * 모달이 내용을 잘라내 제출 버튼을 도달 불가로 만들지 않는다 — 전역 census.
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * `DialogContent` 에 높이 경계 없이 `overflow-hidden` 만 있으면 넘치는 부분을 **잘라내기만**
 * 한다. 폼이 뷰포트보다 길어지는 순간 `DialogFooter`(제출·취소)가 잘린 영역으로 들어가
 * **물리적으로 누를 수 없다** — 사용자는 다 입력하고도 저장할 방법이 없다.
 *
 * 실제로 그렇게 났다. 행사 모달에 필드 두 개를 더하자 1280×720 에서 제출 버튼이 사라졌고,
 * e2e 는 클릭이 영원히 대기하다 60초 뒤 `waitForResponse` 타임아웃으로 죽었다(PR #508 CI).
 * 실패 화면에 검증 오류가 하나도 없는데 POST 가 안 나간 것이 유일한 단서였다 — 즉 이 결함은
 * **증상이 원인을 가린다.** 그래서 원인 조건 자체를 census 로 고정한다.
 *
 * ── 왜 소스 검사인가 ────────────────────────────────────────────────────────
 * jsdom 은 레이아웃을 계산하지 않아 "버튼이 화면 밖인가" 를 렌더로 검증할 수 없다.
 * 레이아웃을 실제로 재는 것은 e2e 의 몫이고, 그 e2e 는 이 결함을 60초 타임아웃이라는
 * 해독하기 어려운 형태로만 알려 준다.
 *
 * ── 예외 ────────────────────────────────────────────────────────────────────
 * 아래 두 파일은 실측으로 위험이 없어 목록에 남긴다. 목록에 없는 새 위반은 red 다.
 * 예외를 늘리는 것이 곧 신호를 지우는 길이므로(H2), 추가할 때는 근거를 함께 적는다.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, '..');

/**
 * 잘라내도 되는 다이얼로그 — 폼도 푸터도 없어 내용이 늘어날 축이 없다.
 *
 *  - `session-expiry-warning`: 입력 0·DialogFooter 0 인 고정 크기 경고. `overflow-hidden` 은
 *    내부 카드의 둥근 모서리를 위한 것이다.
 *  - `cop/sms/selectSmsList`: `next.config.ts` 리다이렉트로 **도달 불가**한 별칭 화면이다
 *    (DEC-OPS-023 ① — 도달 불가 화면은 이행 대상이 아니다). 도달 가능해지면 함께 고친다.
 *  - `components/ui/command.tsx`: shadcn 원시 컴포넌트(CommandDialog). 내부 `CommandList` 가
 *    `max-h-[300px] overflow-y-auto` 로 **자체 스크롤**을 가지므로 바깥에서 잘려도 도달 불가가
 *    되지 않는다. 폼·푸터를 담는 용도가 아니다.
 */
const ALLOWED_CLIPPING = [
  'app/components/ui/session-expiry-warning.tsx',
  'app/cop/sms/selectSmsList/SmsHubClient.tsx',
  'components/ui/command.tsx',
];

const HEIGHT_BOUND = /max-h-\[[^\]]+\]|max-h-screen|max-h-full/;
const SCROLLS = /overflow-y-auto|overflow-auto|overflow-y-scroll/;

function collectTsx(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === '__tests__') continue;
      collectTsx(full, out);
      continue;
    }
    if (entry.endsWith('.tsx')) out.push(full);
  }
  return out;
}

describe('DialogContent 도달 가능성 census', () => {
  const files = collectTsx(SRC);

  it('스캔 대상이 비어 있지 않다 — vacuous 통과 방지', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('높이 경계 없이 잘라내는 DialogContent 는 허용 목록뿐이다', () => {
    const offenders: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      // 여는 태그 하나 단위로 본다 — 파일 전체를 보면 다른 요소의 클래스가 섞인다.
      for (const match of source.matchAll(/<DialogContent[^>]*>/g)) {
        const tag = match[0];
        if (!tag.includes('overflow-hidden')) continue;
        if (HEIGHT_BOUND.test(tag) && SCROLLS.test(tag)) continue;
        offenders.push(file.slice(SRC.length + 1).replace(/\\/g, '/'));
      }
    }

    expect([...new Set(offenders)].sort()).toEqual([...ALLOWED_CLIPPING].sort());
  });

  it('허용 목록의 파일들은 여전히 폼 다이얼로그가 아니다 — 전제가 바뀌면 재판정한다', () => {
    for (const relative of ALLOWED_CLIPPING) {
      const source = readFileSync(join(SRC, relative), 'utf8');
      // DialogFooter 가 생겼다면 제출 버튼이 잘릴 수 있다는 뜻이므로 예외 근거가 무너진다.
      expect(source, `${relative} 에 DialogFooter 가 생겼다 — 예외에서 빼고 스크롤을 줘야 한다`)
        .not.toContain('<DialogFooter');
    }
  });
});
