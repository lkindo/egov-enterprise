import { describe, expect, it } from 'vitest';
import {
  normalizeInternalRoute,
  resolveMenuInternalRoute,
} from '../internal-route';

describe('internal route normalization', () => {
  it.each([
    ['/admin/work-hub?tab=job#calendar', '/admin/work-hub?tab=job#calendar'],
    ['/', '/'],
    ['uat/uia/actionLogin.do?returnUrl=%2Fadmin#form', '/uat/uia/actionLogin.do?returnUrl=%2Fadmin#form'],
    ['/검색?q=%ED%95%9C%EA%B8%80#결과', '/%EA%B2%80%EC%83%89?q=%ED%95%9C%EA%B8%80#%EA%B2%B0%EA%B3%BC'],
  ])('same-origin route %s를 %s로 정규화한다', (raw, expected) => {
    expect(normalizeInternalRoute(raw)).toBe(expected);
  });

  it.each([
    undefined,
    null,
    '',
    '#',
    'dir',
    'javascript:alert(1)',
    'https://evil.example/phish',
    '//evil.example/phish',
    '\\evil.example\\phish',
    '/safe\\evil',
    ' /admin/work-hub',
    '/admin/work-hub ',
    '/admin/\twork-hub',
    '/admin/\nwork-hub',
    '/admin/\rwork-hub',
    '/admin/%09work-hub',
    '/admin/%0awork-hub',
    '/admin/%0Dwork-hub',
    '/admin/%7fwork-hub',
    '/%2e%2e//evil.example',
    '/%252e%252e/%252f%252fevil.example',
    '/%2f%2fevil.example',
    '/%5cevil.example',
    '/safe/../evil',
    '/safe/./evil',
    '/malformed%ZZ',
    'admin/work-hub',
  ])('위험하거나 계약 밖인 route %s를 거부한다', (raw) => {
    expect(normalizeInternalRoute(raw)).toBeNull();
  });

  it('modernRoute 로만 이동하고, 비어 있으면 이동할 곳이 없다', () => {
    expect(resolveMenuInternalRoute({ modernRoute: '/admin/work-hub?tab=job' })).toBe('/admin/work-hub?tab=job');
    expect(resolveMenuInternalRoute({ modernRoute: 'legacy/menu.do?menuNo=1' })).toBe('/legacy/menu.do?menuNo=1');
    expect(resolveMenuInternalRoute({ modernRoute: '' })).toBeNull();
    expect(resolveMenuInternalRoute({ modernRoute: null })).toBeNull();
  });

  it('존재하지만 유효하지 않은 modernRoute는 거부한다', () => {
    expect(resolveMenuInternalRoute({ modernRoute: '//evil.example/phish' })).toBeNull();
  });
});

/**
 * [2026-09-04 · PD-UX-002 Q3] chkURL fallback 을 레거시 `.do` 로 좁혔다 — 그 값은 `tb_prgrm_lst.url` 의 별칭이었고
 * 그 컬럼에는 인가용 API 패턴이 들어 있었다(2026-09-04 live 실측 18행).
 * [2026-10-05] fallback 을 걷었다. 서버는 프로그램 원장도 레거시 파일명도 읽지 않아 chkURL 은 경로 또는 '#' 이다.
 *
 * ⚠ chkURL fallback 을 되살리지 말 것 — 프로그램 화면으로 이동해야 한다면 그 메뉴에 `modernRoute` 를 지정한다.
 */
describe('chkURL 은 목적지가 아니다', () => {
  it('경로가 없으면 chkURL 이 무엇이든 이동하지 않는다', () => {
    for (const chkURL of ['legacy/menu.do?menuNo=1', '/legacy/menu.do', '/admin/work-hub', '/api/v1/admin/**', '#', '/']) {
      // 메뉴 응답(MenuInfo)은 chkURL 을 싣는다 — 해석기 입력에 그대로 넘겨도 쓰지 않아야 한다.
      const menu = { modernRoute: null, chkURL };
      expect(resolveMenuInternalRoute(menu), chkURL).toBeNull();
    }
  });

  it('modernRoute 가 있으면 그것만 쓴다', () => {
    const menu = { modernRoute: '/admin/x?tab=a', chkURL: 'legacy/menu.do' };
    expect(resolveMenuInternalRoute(menu)).toBe('/admin/x?tab=a');
  });
});
