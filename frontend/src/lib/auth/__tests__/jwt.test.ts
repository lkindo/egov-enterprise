import { describe, expect, it } from 'vitest';

import { getJwtExpiryMs } from '../jwt';

function jwt(payload: unknown): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8')
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `header.${encoded}.signature`;
}

describe('getJwtExpiryMs', () => {
  it('base64url 페이로드의 NumericDate exp를 밀리초로 변환한다', () => {
    expect(getJwtExpiryMs(jwt({ sub: 'user-1', exp: 1_800_000_123 })))
      .toBe(1_800_000_123_000);
  });

  it('UTF-8 클레임이 함께 있어도 exp를 읽는다', () => {
    expect(getJwtExpiryMs(jwt({ name: '관리자😀', exp: 1_800_000_123 })))
      .toBe(1_800_000_123_000);
  });

  it.each([
    ['세 구간이 아닌 토큰', 'header.payload'],
    ['깨진 base64/JSON', 'header.%%%.signature'],
    ['exp가 없는 페이로드', jwt({ sub: 'user-1' })],
    ['문자열 exp', jwt({ exp: '1800000123' })],
    ['무한대가 되는 exp', jwt({ exp: 1e308 })],
    ['0 이하 exp', jwt({ exp: -1 })],
  ])('%s는 만료 힌트를 만들지 않는다', (_label, token) => {
    expect(getJwtExpiryMs(token)).toBeNull();
  });
});
