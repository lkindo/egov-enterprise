import { describe, expect, it, vi } from 'vitest';

/**
 * 메뉴 → 화면 판정은 별칭을 한 번만 따라간다 — 목적지가 또 별칭이면 판정하지 않는다(menu-screen-resolution.ts 규칙 3).
 *
 * 실제 별칭에는 2026-11-08 부터 연쇄가 없어(설문 등록 옛 경로가 허브로 바로 넘긴다) 생성 목록으로는 이 규칙을 보일 수 없다.
 * 그래서 생성 목록에 연쇄 별칭 둘을 덧붙여 본다. 이 규칙이 풀리면 연쇄 끝의 화면에 메뉴가 붙는데, 그 화면은 런타임에
 * 그 메뉴가 실제로 여는 화면이라고 단정할 수 없다.
 */
const CHAIN_START = '/admin/zz-alias-chain/start';
const CHAIN_MIDDLE = '/admin/zz-alias-chain/middle';
const CHAIN_END = '/admin/system/programs';

vi.mock('@/types/generated-screen-registry', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/types/generated-screen-registry')>();
  return {
    ...original,
    SCREEN_ALIASES: [
      ...original.SCREEN_ALIASES,
      { route: CHAIN_START, target: CHAIN_MIDDLE, kind: 'page-redirect' },
      { route: CHAIN_MIDDLE, target: CHAIN_END, kind: 'config-redirect' },
    ],
  };
});

const { findScreen } = await import('@/types/generated-screen-registry');
const { resolveMenuScreen } = await import('../menu-screen-resolution');

describe('별칭 연쇄', () => {
  it('별칭은 한 번만 따라간다 — 목적지가 또 별칭이면 판정하지 않는다', () => {
    // 주입한 경로가 실제 화면과 겹치지 않아야 이 시험이 연쇄만 본다.
    expect(findScreen(CHAIN_START)).toBeNull();
    expect(findScreen(CHAIN_MIDDLE)).toBeNull();
    expect(resolveMenuScreen(CHAIN_MIDDLE)?.screen.route).toBe(CHAIN_END);
    expect(resolveMenuScreen(CHAIN_START)).toBeNull();
  });
});
