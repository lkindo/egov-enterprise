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

  it('modernRoute를 우선하고, 비어 있을 때만 chkURL을 사용한다', () => {
    expect(resolveMenuInternalRoute({
      modernRoute: '/admin/work-hub?tab=job',
      chkURL: 'legacy/menu.do',
    })).toBe('/admin/work-hub?tab=job');

    expect(resolveMenuInternalRoute({
      modernRoute: '',
      chkURL: 'legacy/menu.do?menuNo=1',
    })).toBe('/legacy/menu.do?menuNo=1');
  });

  it('존재하지만 유효하지 않은 modernRoute를 chkURL로 우회하지 않는다', () => {
    expect(resolveMenuInternalRoute({
      modernRoute: '//evil.example/phish',
      chkURL: '/admin/work-hub',
    })).toBeNull();
  });
});

/**
 * [2026-09-04 · PD-UX-002 Q3] chkURL fallback 을 레거시 `.do` 로 좁힌 계약.
 *
 * chkURL 은 화면 경로가 아니라 `tb_prgrm_lst.url` 의 별칭이고, 그 컬럼에는 **인가용 API 패턴**이
 * 들어 있다(2026-09-04 live 실측 18행: `/api/v1/admin/**`·`/actuator/**`·`{userId}` 형태).
 * 종전에는 그런 값이 `normalizeInternalRoute` 를 그대로 통과해 내비게이션 목적지가 됐다
 * (실행 확인: 리졸버가 `/api/v1/admin/**` 를 그대로 반환).
 *
 * ⚠ 이 테스트를 넓혀 절대경로 chkURL 을 다시 허용하지 말 것 — 그러면 인가 패턴이 다시
 *   사용자 URL 이 된다. 프로그램 화면으로 이동해야 한다면 그 메뉴에 `modernRoute` 를 지정한다.
 */
describe('chkURL fallback 은 레거시 .do 로만 떨어진다', () => {
  it('인가 패턴을 내비게이션 목적지로 만들지 않는다', () => {
    for (const apiPattern of ['/api/v1/admin/**', '/actuator/**', '/api/v1/admin/system/users/{userId}']) {
      expect(resolveMenuInternalRoute({ modernRoute: null, chkURL: apiPattern })).toBeNull();
    }
  });

  it('절대경로 chkURL 은 .do 가 아니면 쓰지 않는다', () => {
    expect(resolveMenuInternalRoute({ modernRoute: '', chkURL: '/admin/work-hub' })).toBeNull();
  });

  it('레거시 .do 는 상대·절대 형태 모두 계속 동작한다', () => {
    expect(resolveMenuInternalRoute({ modernRoute: '', chkURL: 'legacy/menu.do?menuNo=1' }))
      .toBe('/legacy/menu.do?menuNo=1');
    expect(resolveMenuInternalRoute({ modernRoute: null, chkURL: '/legacy/menu.do' }))
      .toBe('/legacy/menu.do');
  });

  it('modernRoute 가 있으면 chkURL 을 보지 않는다', () => {
    expect(resolveMenuInternalRoute({ modernRoute: '/admin/x?tab=a', chkURL: 'legacy/menu.do' }))
      .toBe('/admin/x?tab=a');
  });
});
