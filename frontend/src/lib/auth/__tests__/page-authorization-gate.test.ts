import { describe, expect, it, vi } from 'vitest';

/**
 * 게이트 편입 판정(requiresRegisteredPermission) — 라우트 게이트(proxy.ts)와 링크 노출(page-access.ts)은 `/admin` 전체와 함께
 * `/admin` 밖이라도 기능권한이 등록된 화면을 막는다(2026-11-08). 실제 원장에는 그런 화면이 거의 없어(SMS 옛 경로 하나, 그마저
 * next.config 리다이렉트가 먼저 돈다) 합성 원장으로 규칙을 본다.
 */
vi.mock('@/types/generated-permissions', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/types/generated-permissions')>(),
  PAGE_PERMISSIONS: {
    '/zz-ops/report': ['SURVEY_RSP_READ'],
    '/zz-ops/report/[id]': ['SURVEY_RSP_READ'],
    '/zz-ops/[id]': ['SURVEY_RSP_READ'],
    '/zz-ops/new': [],
    '/zz-open': [],
    '/admin/zz-console': ['MENU_READ'],
  },
  PAGE_PERMISSION_MODES: {},
}));

const { requiresRegisteredPermission, canEnterRegisteredPage } = await import('../page-authorization');
const { canOpenPage } = await import('../page-access');

const subject = (permissions: string[]) => ({ permissions, authorizationVersion: 'v1' });

describe('requiresRegisteredPermission', () => {
  it('권한이 등록된 /admin 밖 화면을 게이트에 넣는다 — 정적·동적·끝 슬래시', () => {
    expect(requiresRegisteredPermission('/zz-ops/report')).toBe(true);
    expect(requiresRegisteredPermission('/zz-ops/report/')).toBe(true);
    expect(requiresRegisteredPermission('/zz-ops/report/42')).toBe(true);
  });

  it('대소문자를 흉내 내도 게이트에 들어가고, 정확한 등록이 없어 거부된다', () => {
    expect(requiresRegisteredPermission('/ZZ-ops/Report')).toBe(true);
    expect(canEnterRegisteredPage('/ZZ-ops/Report', subject(['SURVEY_RSP_READ']))).toBe(false);
  });

  it('인증만 요구하는 화면과 등록되지 않은 /admin 밖 화면은 게이트 대상이 아니다', () => {
    expect(requiresRegisteredPermission('/zz-open')).toBe(false);
    expect(requiresRegisteredPermission('/zz-unregistered')).toBe(false);
    expect(requiresRegisteredPermission('/zz-ops/report/42/extra')).toBe(false);
  });

  it('정확히 등록된 정적 화면은 그 등록이 정한다 — 동적 형제의 권한 때문에 권한 조회에 묶이지 않는다', () => {
    // 묶이면 권한 조회가 실패할 때 인증만 요구하는 화면까지 막힌다(2026-11-08 Codex 13차).
    expect(requiresRegisteredPermission('/zz-ops/new')).toBe(false);
    expect(requiresRegisteredPermission('/zz-ops/new/')).toBe(false);
    expect(requiresRegisteredPermission('/zz-ops/7')).toBe(true);
    expect(canEnterRegisteredPage('/zz-ops/new', subject([]))).toBe(true);
    expect(canEnterRegisteredPage('/zz-ops/7', subject([]))).toBe(false);
  });
});

describe('canOpenPage 는 같은 게이트를 쓴다', () => {
  it('/admin 밖이라도 권한이 등록된 화면은 그 권한이 있어야 링크를 보인다', () => {
    expect(canOpenPage(subject([]), '/zz-ops/report?page=2')).toBe(false);
    expect(canOpenPage(null, '/zz-ops/report/5')).toBe(false);
    expect(canOpenPage(subject(['SURVEY_RSP_READ']), '/zz-ops/report#top')).toBe(true);
    expect(canOpenPage(subject(['SURVEY_RSP_READ']), '/ZZ-ops/report')).toBe(false);
  });

  it('게이트 밖 화면은 그대로 열리고 /admin 은 종전과 같다', () => {
    expect(canOpenPage(null, '/zz-open')).toBe(true);
    expect(canOpenPage(null, '/zz-unregistered')).toBe(true);
    expect(canOpenPage(subject([]), '/admin/zz-console')).toBe(false);
    expect(canOpenPage(subject(['MENU_READ']), '/admin/zz-console')).toBe(true);
  });
});
