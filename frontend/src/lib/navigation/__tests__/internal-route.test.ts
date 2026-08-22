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
