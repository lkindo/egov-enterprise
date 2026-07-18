import { describe, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 🔗 하드코딩 색상 차단 게이트 — 브랜딩 토큰화(§2.B) 드리프트 방지.
 *
 * 중립(slate/gray/zinc/neutral/stone) + 브랜드 액센트(blue/indigo/sky/violet/purple/cyan/teal/fuchsia)
 * 하드코딩 Tailwind 팔레트 클래스는 globals.css 시맨틱/hub-* 토큰으로 대체해야 한다
 * (docs/03-guides/design-tokens.md). 리브랜딩=토큰 편집을 성립시키는 불변식.
 *
 * 현재 잔여(파스텔 틴트·히트맵 명암스케일 등 의도적 미치환)는 BASELINE 으로 동결(grandfather)하고,
 * <b>신규 증가만 차단</b>한다. status 색(red/green/emerald/rose/amber/orange/yellow/lime/pink)은
 * 성공/경고/오류 시맨틱이라 제외한다(별도 success/warning/destructive 토큰 대상).
 *
 * 신규 코드가 팔레트 리터럴을 추가하면 이 게이트가 실패한다 → 토큰으로 바꾸거나, 정당한 예외면
 * BASELINE 을 사유와 함께 올린다(단, 방향은 감소여야 함).
 */
const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');
const NEUTRAL_AND_BRAND = 'slate|gray|zinc|neutral|stone|blue|indigo|sky|violet|purple|cyan|teal|fuchsia';
const UTIL = 'text|bg|border|ring|divide|from|to|via|placeholder|fill|stroke|shadow|ring-offset|caret|outline|decoration|accent';
const VARIANT = '(?:dark:|hover:|focus:|group-hover:|focus-within:|active:|group-focus-within:)?';
const PATTERN = new RegExp(`${VARIANT}(?:${UTIL})-(?:${NEUTRAL_AND_BRAND})-[0-9]{2,3}(?:\\/[0-9]{1,3})?`, 'g');

// [동결 2026-07-18] 브랜딩 토큰화(중립 861 + 액센트 195) 이후 잔여 census. 방향은 감소만 허용.
const BASELINE = 247;

function collectFiles(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.next' || e.name === '__tests__') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...collectFiles(p));
    else if (/\.(tsx|jsx)$/.test(e.name) && !/\.test\./.test(e.name)) out.push(p);
  }
  return out;
}

describe('하드코딩 색상 차단 게이트 (§2.B 브랜딩 토큰화 드리프트 방지)', () => {
  it(`중립+브랜드액센트 하드코딩 occurrence 는 BASELINE(${BASELINE}) 이하여야 한다`, () => {
    const files = collectFiles(SRC);

    // 게이트 무결성(false-green 방지): 스캔이 조용히 0건이면 vacuous 통과 → 차단
    if (files.length < 50) {
      throw new Error(`게이트 무결성 파손: .tsx/.jsx 스캔 건수(${files.length})가 예상 하한(50) 미만 — 스캔/경로 파손 의심.`);
    }

    let total = 0;
    const offenders: Array<{ file: string; count: number }> = [];
    for (const f of files) {
      const m = readFileSync(f, 'utf8').match(PATTERN);
      if (m && m.length > 0) {
        total += m.length;
        offenders.push({ file: f.replace(SRC, 'src'), count: m.length });
      }
    }

    if (total > BASELINE) {
      offenders.sort((a, b) => b.count - a.count);
      throw new Error(
        `🔗 [COLOR GUARD] 하드코딩 팔레트 색 ${total}건 > 베이스라인 ${BASELINE} — 신규 ${total - BASELINE}건 증가.\n` +
        `globals.css 토큰(hub-*/시맨틱)으로 대체하세요(docs/03-guides/design-tokens.md). status 색은 제외 대상.\n` +
        `상위 파일:\n` + offenders.slice(0, 10).map(o => `  ${o.count}  ${o.file}`).join('\n')
      );
    }
  });
});
