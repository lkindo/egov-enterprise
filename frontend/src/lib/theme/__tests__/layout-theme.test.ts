import { describe, expect, it } from 'vitest';

import { buildTokenVars, DEFAULT_THEME_CONFIG } from '../layout-theme';

/** 전경색 토큰 — globals.css 의 foreground 토큰(slate-900 #0f172a, slate-50 #f8fafc)과 같은 채널. */
const DARK = '222.2 47.4% 11.2%';
const LIGHT = '210 40% 98%';
/** 두 토큰이 모두 하한에 못 미칠 때의 순수한 검정·흰색. */
const BLACK = '0 0% 0%';
const WHITE = '0 0% 100%';
const CANDIDATE_HEX: Record<string, string> = { [DARK]: '#0f172a', [LIGHT]: '#f8fafc', [BLACK]: '#000000', [WHITE]: '#ffffff' };
/** 레이아웃 관리 화면의 색상 프리셋(LayoutManagerClient 의 PRESET_COLORS). */
const PRESET_COLORS = ['#0050ff', '#10b981', '#f43f5e', '#8b5cf6'];

/** 시험 쪽 독립 계산 — 구현의 HSL 경로가 아니라 hex 의 sRGB 값에서 바로 WCAG 상대 휘도를 잰다. */
function luminanceOfHex(hex: string): number {
  const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
  const [r, g, b] = channels.map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(hexA: string, hexB: string): number {
  const [a, b] = [luminanceOfHex(hexA), luminanceOfHex(hexB)];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function foregroundFor(primaryColor: string): string {
  return buildTokenVars({ ...DEFAULT_THEME_CONFIG, primaryColor })['--primary-foreground']!;
}

/** 0x00·0x33·…·0xff 여섯 단계를 세 채널로 짠 216색. */
const SWEEP = [0, 0x33, 0x66, 0x99, 0xcc, 0xff].flatMap((r) => [0, 0x33, 0x66, 0x99, 0xcc, 0xff].flatMap((g) =>
  [0, 0x33, 0x66, 0x99, 0xcc, 0xff].map((b) => `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`)));

describe('layout-theme 전경색 선택', () => {
  it('기본색은 종전처럼 밝은 글자 토큰이다', () => {
    expect(foregroundFor(DEFAULT_THEME_CONFIG.primaryColor)).toBe(LIGHT);
  });

  it('명도는 낮지만 휘도가 큰 녹색에는 어두운 글자 토큰을 고른다 — 종전의 명도 60 기준은 흰 글자(약 2.4:1)를 골랐다', () => {
    expect(foregroundFor('#10b981')).toBe(DARK);
    expect(foregroundFor('#00ff00')).toBe(DARK);
  });

  it('두 토큰이 모두 하한에 못 미치는 보라색 프리셋에는 검정·흰색 가운데 대비가 큰 쪽을 쓴다', () => {
    expect(contrast('#8b5cf6', CANDIDATE_HEX[DARK]!)).toBeLessThan(4.5);
    expect(contrast('#8b5cf6', CANDIDATE_HEX[LIGHT]!)).toBeLessThan(4.5);
    expect(foregroundFor('#8b5cf6')).toBe(BLACK);
  });

  it.each(PRESET_COLORS)('프리셋 %s 의 단추 글자는 일반 텍스트 하한(4.5:1)을 넘는다', (hex) => {
    const chosen = foregroundFor(hex);
    expect(contrast(hex, CANDIDATE_HEX[chosen]!)).toBeGreaterThanOrEqual(4.5);
    expect(buildTokenVars({ ...DEFAULT_THEME_CONFIG, primaryColor: hex })['--color-primary-foreground']).toBe(`hsl(${chosen})`);
  });

  /*
   * 화면은 고른 hex 가 아니라 소수 첫째 자리로 반올림한 HSL 채널(--primary)을 그리고, 구현은 그 채널로 잰다. 이 시험은 hex 로 따로 재므로
   * 하한 바로 옆의 색은 반올림만큼(0.02 안쪽) 어긋날 수 있다 — 그 띠 안의 색은 토큰 여부를 묻지 않는다.
   */
  it('임의로 고른 색(216색)에서도 단추 글자가 4.5:1 을 넘고, 토큰으로 되면 토큰을 쓴다', () => {
    for (const hex of SWEEP) {
      const chosen = foregroundFor(hex);
      expect(contrast(hex, CANDIDATE_HEX[chosen]!), hex).toBeGreaterThanOrEqual(4.48);
      const bestToken = Math.max(contrast(hex, CANDIDATE_HEX[DARK]!), contrast(hex, CANDIDATE_HEX[LIGHT]!));
      if (bestToken >= 4.52) expect([DARK, LIGHT], hex).toContain(chosen);
      if (bestToken <= 4.48) expect([BLACK, WHITE], hex).toContain(chosen);
    }
  });
});
