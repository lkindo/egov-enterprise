import { describe, expect, it } from 'vitest';

import { DENSITIES, DEFAULT_DENSITY, resolveDensity } from '../density';

describe('resolveDensity', () => {
  it('allowlist 의 밀도는 그대로 통과한다', () => {
    for (const density of DENSITIES) {
      expect(resolveDensity(density)).toBe(density);
    }
  });

  it('미지정·빈 값·allowlist 밖 값은 기본 밀도로 강등한다', () => {
    // 알 수 없는 값이 <html> 속성에 실리면 compact 오버라이드 활성 여부가 env 오타에
    // 좌우되는 비결정 상태가 되므로 통과가 아니라 강등이 계약이다.
    expect(resolveDensity(undefined)).toBe(DEFAULT_DENSITY);
    expect(resolveDensity('')).toBe(DEFAULT_DENSITY);
    expect(resolveDensity('dense')).toBe(DEFAULT_DENSITY);
    expect(resolveDensity('COMPACT')).toBe(DEFAULT_DENSITY);
    expect(resolveDensity('compact; DROP TABLE')).toBe(DEFAULT_DENSITY);
  });
});
