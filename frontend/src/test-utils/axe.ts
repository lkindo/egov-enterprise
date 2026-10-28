/**
 * 컴포넌트 렌더 결과에 axe 를 돌리는 시험 도우미(2026-10-28 감사 D6-2).
 *
 * 종전에는 axe 가 E2E(@axe-core/playwright)에만 있어, 공용 셸·컴포넌트의 접근성 이름 결함(예: axe 4.14 의
 * label-content-name-mismatch — aria-label 이 보이는 글자를 담지 않는 단추)이 격리 E2E 까지 가야 드러났다. 여기서는 같은
 * axe 엔진을 jsdom 렌더에 돌린다. 판은 E2E 의 @axe-core/playwright 가 쓰는 판과 같게 고정한다(axe.test.tsx).
 *
 * jsdom 에는 레이아웃·그리기가 없다. 그래서 판정할 수 없는 규칙만 **아래 목록 한 곳에서** 끈다. 목록 밖 규칙은 E2E 와 같은
 * 기본 집합(실험 규칙 제외) 그대로 돈다. 규칙을 끄는 사유는 "jsdom 이 판정할 수 없다" 하나뿐이다 — 렌더된 화면의 실제 위반을
 * 지우려고 이 목록을 늘리지 않는다(H2). 끈 규칙은 E2E 의 axe 감사(e2e/fixtures/accessibility.ts)가 실제 브라우저에서 본다.
 */
import axe from 'axe-core';
import { expect } from 'vitest';

/**
 * jsdom 이 판정할 수 없어 끄는 규칙과 그 사유 — 끄는 규칙은 이 목록에만 둔다.
 *
 * 2026-10-28 jsdom 실측: color-contrast 는 #eee/#fff 단추에도 오류로 incomplete 를 내고, link-in-text-block 은 늘 inapplicable 이며,
 * target-size 는 4×4px 단추 둘을 통과로 판정했다(상자가 모두 0). 판정이 아니라 판정 불가이거나 거짓 통과다.
 * region·landmark-one-main·page-has-heading-one 은 이 목록에 없다 — 다섯 렌더 시험(게시판 만들기·지식 허브·도움말·알림 드로어·
 * 셸 머리글)에서 부분 렌더가 이 규칙들을 붉히지 않았다. 부분 렌더 때문에 붉어지는 실측이 생기면 그 사유를 적고 여기에 더한다.
 */
export const JSDOM_UNJUDGEABLE_AXE_RULES: Readonly<Record<string, string>> = Object.freeze({
  'color-contrast': '전경·배경 대비는 레이아웃(elementsFromPoint)과 그리기가 필요하다 — jsdom 에서는 오류로 incomplete 가 된다',
  'link-in-text-block': '문단 안 링크의 구분은 주변 글자와의 색 대비로 판정한다 — jsdom 에서는 늘 inapplicable 이다',
  'target-size': '누름 대상의 크기·간격은 실제 상자가 필요하다 — jsdom 의 상자는 0 이라 4×4px 단추도 통과로 판정한다',
});

const RUN_OPTIONS: axe.RunOptions = {
  rules: Object.fromEntries(Object.keys(JSDOM_UNJUDGEABLE_AXE_RULES).map(rule => [rule, { enabled: false }])),
  resultTypes: ['violations'],
};

/**
 * axe 는 아이콘 글꼴(ligature)을 거르려고 canvas 2d 로 글자를 그려 본다(label-content-name-mismatch 의 보이는 글자 계산).
 * jsdom 의 canvas 는 구현이 없어 null 을 주고 "Not implemented" 를 남긴다. 모든 글자를 "보통 글자"로 그리는 최소 대역을 둔다 —
 * 첫 글자와 전체 글자가 같은 화소로 그려지므로 ligature 판정은 늘 거짓이고, 보이는 글자는 빠짐없이 이름 대조에 들어간다
 * (너비 0 을 돌려주면 모든 글자가 아이콘으로 빠져 대조가 통째로 비고 거짓 통과가 된다). 감사하는 동안만 두고 되돌린다 — 같은 파일의
 * 다른 시험이 쓰는 canvas 를 바꾸지 않는다.
 */
function stubCanvas(): () => void {
  const prototype = HTMLCanvasElement.prototype;
  const original = Object.getOwnPropertyDescriptor(prototype, 'getContext');
  Object.defineProperty(prototype, 'getContext', {
    configurable: true,
    writable: true,
    value: function getContext(this: HTMLCanvasElement) {
      return {
        canvas: this,
        font: '', textAlign: 'left', textBaseline: 'top',
        measureText: (text: string) => ({ width: 30 * Math.max(1, text.length) }),
        fillText: () => undefined,
        clearRect: () => undefined,
        getImageData: (_x: number, _y: number, width: number, height: number) =>
          ({ data: new Uint8ClampedArray(Math.max(1, Math.ceil(width) * Math.ceil(height)) * 4).fill(1) }),
      };
    },
  });
  return () => {
    if (original) Object.defineProperty(prototype, 'getContext', original);
    else Reflect.deleteProperty(prototype, 'getContext');
  };
}

/**
 * vitest.setup.ts 의 lucide-react 대역은 아이콘을 `<span data-testid="icon-이름">이름</span>` 으로 그린다. 실제 아이콘은 글자가 없는
 * svg 다 — 대역의 글자를 그대로 두면 axe 가 'RefreshCcw 새로고침' 처럼 아이콘 이름을 보이는 글자로 읽어, 운영 화면에는 없는
 * label-content-name-mismatch 를 낸다(2026-10-28 실측: 지식 허브 새로고침 단추·머리글 아이콘 단추 14개). 감사하는 동안만 대역의
 * 글자 노드를 떼어 실제 DOM 과 같게 두고, 끝나면 같은 노드를 되돌린다(React 가 쥔 노드를 바꾸지 않는다).
 */
function detachIconMockText(root: Element): () => void {
  const detached = [...root.querySelectorAll<HTMLElement>('[data-testid^="icon-"]')]
    .filter(icon => icon.childElementCount === 0 && icon.textContent !== ''
      && icon.dataset.testid === `icon-${icon.textContent?.toLowerCase()}`)
    .map(icon => ({ icon, nodes: [...icon.childNodes] }));
  for (const { icon } of detached) icon.replaceChildren();
  return () => { for (const { icon, nodes } of detached) icon.replaceChildren(...nodes); };
}

function describeViolation(violation: axe.Result): string {
  const targets = violation.nodes.map(node => node.target.join(' ')).join(', ');
  return `${violation.id}(${violation.nodes.length}): ${violation.help} — ${targets}`;
}

/**
 * 렌더된 container 에 axe 위반이 없음을 단언한다. Portal 로 body 에 그리는 대화상자·팝오버는 그 요소나 document.body 를 넘긴다.
 * 판정을 통과한 규칙이 하나도 없으면(빈 렌더) 실패한다 — 빈 조각의 통과는 증거가 아니다.
 */
export async function expectNoAxeViolations(container: Element): Promise<void> {
  const restoreCanvas = stubCanvas();
  const restoreIconText = detachIconMockText(container);
  let results: axe.AxeResults;
  try {
    results = await axe.run(container, RUN_OPTIONS);
  } finally {
    restoreIconText();
    restoreCanvas();
  }
  expect(results.violations.map(describeViolation),
    `axe 위반(jsdom 이 판정할 수 있는 규칙): ${results.violations.map(violation => violation.id).join(', ')}`).toEqual([]);
  expect(results.passes.length, 'axe 가 판정한 규칙이 없다 — 렌더가 비었거나 대상이 틀렸다').toBeGreaterThan(0);
}
