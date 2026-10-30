import { describe, expect, it } from 'vitest';

import { bannerSchema } from '../BannerAssetsPanel';
import { popupSchema } from '../PopupAssetsPanel';

/*
  배너·팝업 폼 스키마의 생성 제약 보존 — 홍보 기능 소유(Phase 2 10단계 10c-1). 종전 core 의 생성 제약 보존 시험
  (lib/validation/__tests__/generated-constraint-preservation)에 있어, 홍보를 고르지 않은 생성물에서 그 파일의 core 사례까지 연쇄로 빠졌다.
*/
describe('banner and popup generated constraints', () => {
  it('keeps banner and popup generated string lengths', () => {
    expect(bannerSchema.safeParse({
      bnrNm: '가'.repeat(101),
      sortOrdr: 0,
      rfltYn: 'Y',
    }).success).toBe(false);

    const validPopup = {
      popupTtlNm: '공지',
      ntceBgnde: '2026-08-26',
      ntceEndde: '2026-08-27',
      popupWdthPstn: 0,
      popupVrtcPstn: 0,
      popupWdthSz: '400',
      popupVrtcSz: '400',
      ntceYn: 'Y',
      stopvewSetupYn: 'Y',
    };

    expect(popupSchema.safeParse({ ...validPopup, popupTtlNm: '가'.repeat(101) }).success).toBe(false);
    expect(popupSchema.safeParse({ ...validPopup, popupWdthPstn: '1'.repeat(13) }).success).toBe(false);
    expect(popupSchema.safeParse(validPopup).success).toBe(true);
  });

  it.each(['99', '4001', '0100', '100.0', '+100', '-100', '1e3', 'abc', '', ' 100', '100 ', '100\n', '100\r\n', 100, null])('크기를 자동 보정하지 않고 원문 %j를 거절한다', (value) => {
    const valid = { popupTtlNm: '공지', ntceBgnde: '2026-10-01', ntceEndde: '2026-10-31', popupWdthPstn: 0, popupVrtcPstn: 0, popupWdthSz: '100', popupVrtcSz: '4000', ntceYn: 'Y', stopvewSetupYn: 'Y' };
    expect(popupSchema.safeParse({ ...valid, popupWdthSz: value }).success).toBe(false);
    expect(popupSchema.safeParse({ ...valid, popupVrtcSz: value }).success).toBe(false);
  });

  it.each(['100', '999', '1000', '3999', '4000'])('허용 크기 %s를 문자열 그대로 유지한다', (value) => {
    const parsed = popupSchema.parse({ popupTtlNm: '공지', ntceBgnde: '2026-10-01', ntceEndde: '2026-10-31', popupWdthPstn: 0, popupVrtcPstn: 0, popupWdthSz: value, popupVrtcSz: value, ntceYn: 'Y', stopvewSetupYn: 'Y' });
    expect(parsed.popupWdthSz).toBe(value);
    expect(parsed.popupVrtcSz).toBe(value);
  });
});
