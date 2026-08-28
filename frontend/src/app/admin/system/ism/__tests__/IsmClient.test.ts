import { describe, expect, it } from 'vitest';

import { ismSchema } from '../IsmClient';

/**
 * 스키마 계약 — 사유는 **선택**이고 길이 상한만 스키마가 집행한다.
 *
 * 필수 여부는 액션마다 다르다. 서버의 승인 경로(`InformalSanction.approve()`)는 사유를
 * 받지도 저장하지도 않고(`rjct_rsn_cn` 을 null 로 지운다), 반려(`reject(reason)`)만 빈 값을
 * 예외로 막는다. 스키마에 필수를 넣으면 사유를 쓰지도 않는 승인 버튼이 계속 막힌다.
 *
 * 그래서 "반려일 때 필수"는 제출 경로에서 집행하고, 그 계약은
 * `IsmClient.behavior.test.tsx` 가 두 버튼을 실제로 눌러 검증한다.
 */
describe('IsmClient validation contract', () => {
  it('사유는 선택이다 — 승인은 사유 없이 제출된다', () => {
    expect(ismSchema.safeParse({ rjctRsnCn: '반려 사유입니다.' }).success).toBe(true);
    expect(ismSchema.safeParse({}).success).toBe(true);
    expect(ismSchema.safeParse({ rjctRsnCn: '' }).success).toBe(true);
  });

  it('생성된 계약의 길이 상한은 그대로 지킨다', () => {
    expect(ismSchema.safeParse({ rjctRsnCn: '가'.repeat(4000) }).success).toBe(true);
    expect(ismSchema.safeParse({ rjctRsnCn: '가'.repeat(4001) }).success).toBe(false);
  });
});
