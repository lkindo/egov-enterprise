import { describe, expect, it } from 'vitest';

import { manualSchema } from '../manual-form-validation';

/*
  온라인 매뉴얼 폼 스키마의 계약 — 도움말 기능 소유(Phase 2 10단계 10c-1). 종전 공유 위치(lib/validation/__tests__)의
  sms-manual-menu-contracts.test.ts 와 generated-constraint-preservation.test.ts 의 매뉴얼 사례를 스키마와 함께 옮겼다.
*/
describe('manual write-boundary contracts', () => {
  it('keeps generated manual limits while strengthening required trim rules', () => {
    const valid = {
      onlnMnlNm: '매뉴얼',
      onlnMnlSeCd: 'GNR',
      onlnMnlDfn: 'a'.repeat(1000),
      onlnMnlExpln: '가'.repeat(4000),
    };
    expect(manualSchema.safeParse(valid).success).toBe(true);
    expect(manualSchema.safeParse({ ...valid, onlnMnlNm: '   ' }).success).toBe(false);
    expect(manualSchema.safeParse({ ...valid, onlnMnlNm: '가'.repeat(101) }).success).toBe(false);
    expect(manualSchema.safeParse({ ...valid, onlnMnlDfn: 'a'.repeat(1001) }).success).toBe(false);
    expect(manualSchema.safeParse({ ...valid, onlnMnlExpln: '가'.repeat(4001) }).success).toBe(false);
  });

  it('requires a name and a section code', () => {
    expect(manualSchema.safeParse({ onlnMnlNm: '', onlnMnlSeCd: 'GUIDE' }).success).toBe(false);
    expect(manualSchema.safeParse({ onlnMnlNm: '매뉴얼', onlnMnlSeCd: '' }).success).toBe(false);
  });
});
