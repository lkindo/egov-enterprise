import { describe, expect, it } from 'vitest';
import { pickAllowedParams } from '../allowlist-params';

/*
 * [2026-09-23 DEC-OPS-029 Q2 이행] 이 헬퍼가 닫는 것은 "모르는 이름" 하나가 아니다.
 * copy-all 캐리어가 통과시키던 세 축(미지·반복·인코딩)을 각각 대조군과 함께 고정한다.
 * 하나라도 풀리면 URL-state census 가 그 record 를 다시 `opaque` 로 분류한다.
 */
describe('pickAllowedParams', () => {
  it('allowlist 에 있는 값만 다시 싣는다', () => {
    const source = new URLSearchParams('tab=WIKI&page=3&utm_source=mail&sid=abc');
    expect(pickAllowedParams(source, ['tab', 'page']).toString()).toBe('tab=WIKI&page=3');
  });

  it('반복된 이름은 첫 값 하나만 남는다', () => {
    const source = new URLSearchParams('tab=WIKI&tab=FAQ');
    const picked = pickAllowedParams(source, ['tab']);
    expect(picked.getAll('tab')).toEqual(['WIKI']);
  });

  it('인코딩으로 이름을 바꿔도 allowlist 를 우회하지 못한다', () => {
    // '%74ab' 는 디코딩하면 'tab' 이다. URLSearchParams 가 이름을 디코딩한 뒤 대조하므로
    // 아래 두 경우가 같게 취급되며, allowlist 밖 이름은 인코딩해도 살아남지 못한다.
    expect(pickAllowedParams(new URLSearchParams('%74ab=WIKI'), ['tab']).get('tab')).toBe('WIKI');
    expect(pickAllowedParams(new URLSearchParams('%73id=abc'), ['tab']).toString()).toBe('');
  });

  it('값이 비어 있으면 키를 만들지 않는다', () => {
    expect(pickAllowedParams(new URLSearchParams('tab=&page=2'), ['tab', 'page']).toString()).toBe('page=2');
  });

  it('순서는 allowlist 순서를 따른다 — 같은 상태가 같은 URL 이 된다', () => {
    const a = pickAllowedParams(new URLSearchParams('page=2&tab=WIKI'), ['tab', 'page']);
    const b = pickAllowedParams(new URLSearchParams('tab=WIKI&page=2'), ['tab', 'page']);
    expect(a.toString()).toBe(b.toString());
    expect(a.toString()).toBe('tab=WIKI&page=2');
  });

  it('입력을 바꾸지 않는다', () => {
    const source = new URLSearchParams('tab=WIKI&utm_source=mail');
    pickAllowedParams(source, ['tab']);
    expect(source.toString()).toBe('tab=WIKI&utm_source=mail');
  });
});
