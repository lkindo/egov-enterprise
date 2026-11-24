import { describe, expect, it } from 'vitest';

import { buildTokenVars, DEFAULT_THEME_CONFIG } from '../layout-theme';

/** 전경색 후보 — globals.css 의 foreground 토큰(slate-900 #0f172a, slate-50 #f8fafc)과 같은 채널. */
const DARK = '222.2 47.4% 11.2%';
const LIGHT = '210 40% 98%';
const CANDIDATE_HEX = { [DARK]: '#0f172a', [LIGHT]: '#f8fafc' } as const;

/** 시험 쪽 독립 계산 — 구현의 HSL 경로가 아니라 hex 의 sRGB 값에서 바로 WCAG 상대 휘도를 잰다. */
function luminanceOfHex(hex: string): number {
  const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
  const [r, g, b] = channels.map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(hexA: string, hexB: string): number {
  const [a, b] = [luminanceOfHex(hexA), luminanceOfHex(hexB)];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function foregroundFor(primaryColor: string): string {
  return buildTokenVars({ ...DEFAULT_THEME_CONFIG, primaryColor })['--primary-foreground'];
}

describe('layout-theme 전경색 선택', () => {
  it('기본색은 종전처럼 밝은 글자다', () => {
    expect(foregroundFor(DEFAULT_THEME_CONFIG.primaryColor)).toBe(LIGHT);
  });

  it('명도는 낮지만 휘도가 큰 녹색에는 어두운 글자를 고른다 — 종전의 명도 60 기준은 흰 글자(약 2.4:1)를 골랐다', () => {
    expect(foregroundFor('#10b981')).toBe(DARK);
    expect(contrast('#10b981', CANDIDATE_HEX[DARK])).toBeGreaterThanOrEqual(4.5);
    expect(foregroundFor('#00ff00')).toBe(DARK);
  });

  it.each([
    '#0050ff', '#10b981', '#f43f5e', '#8b5cf6', '#00ff00', '#1e3a8a', '#facc15', '#0ea5e9', '#7c3aed', '#000000', '#ffffff',
  ])('%s 에는 두 후보 가운데 대비가 큰 글자를 쓴다', (hex) => {
    const chosen = foregroundFor(hex) as keyof typeof CANDIDATE_HEX;
    const other = chosen === DARK ? LIGHT : DARK;
    expect(contrast(hex, CANDIDATE_HEX[chosen])).toBeGreaterThanOrEqual(contrast(hex, CANDIDATE_HEX[other]));
    expect(buildTokenVars({ ...DEFAULT_THEME_CONFIG, primaryColor: hex })['--color-primary-foreground']).toBe(`hsl(${chosen})`);
  });
});
