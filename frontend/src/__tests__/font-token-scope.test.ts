import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 🔤 글꼴 토큰 스코프 가드 — 선언 위치와 별칭 계산 위치를 맞춘다(GAP-UIF-001).
 *
 * `globals.css` 의 `@theme` 는 `--font-sans` 를 :root 에서 계산한다. next/font 변수가 `body` 에만
 * 있으면 그 시점에 값이 없어 별칭 전체가 무효가 되고, 선언도 preload 도 그대로인 채 브라우저만
 * 시스템 글꼴로 떨어진다. 타입 검사·린트·스냅샷 어디에도 걸리지 않는 조용한 회귀라 여기서 고정한다.
 *
 * 이 가드는 **선언 위치**만 본다. 실제로 그 글꼴로 그려지는지는 계산된 스타일의 몫이며,
 * e2e(`01-core-base.spec.ts`)가 로그인 화면에서 확인한다.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const layout = readFileSync(join(root, 'src/app/layout.tsx'), 'utf8');
const globals = readFileSync(join(root, 'src/app/globals.css'), 'utf8');
const FONT_VARIABLES = ['pretendard.variable', 'inter.variable', 'outfit.variable'];

const htmlTag = layout.slice(layout.indexOf('<html'), layout.indexOf('<body'));
const bodyOpen = layout.indexOf('<body');
const bodyTag = layout.slice(bodyOpen, layout.indexOf('>', bodyOpen) + 1);

describe('글꼴 토큰 스코프', () => {
  it('next/font 변수를 <html> 에 선언한다', () => {
    for (const variable of FONT_VARIABLES) {
      expect(htmlTag).toContain(variable);
    }
  });

  it('body 에는 같은 변수를 다시 선언하지 않는다 — 스코프가 갈리면 별칭이 무효가 된다', () => {
    for (const variable of FONT_VARIABLES) {
      expect(bodyTag).not.toContain(variable);
    }
  });

  it('--font-sans 는 Pretendard 변수를 맨 앞에 둔다', () => {
    const line = globals.split('\n').find((text) => text.trim().startsWith('--font-sans:'));
    expect(line).toBeDefined();
    expect(line?.replace('--font-sans:', '').trim()).toMatch(/^var\(--font-pretendard\)/);
  });
});
