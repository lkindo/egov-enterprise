import { describe, expect, it } from 'vitest';

import { manualSchema, smsSchema } from '@/lib/validation/schemas';

describe('SMS and manual write-boundary contracts', () => {
  it('trims SMS values and enforces phone and screen message boundaries', () => {
    const valid = smsSchema.safeParse({
      sndngTelno: ' 02-1234-5678 ',
      rcptnTelno: ' 010-1234-5678 ',
      sndngCn: ' 전송할 문자 ',
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data).toMatchObject({
        sndngTelno: '02-1234-5678',
        rcptnTelno: '01012345678',
        sndngCn: '전송할 문자',
      });
      expect(valid.data).not.toHaveProperty('recipients');
    }

    expect(smsSchema.safeParse({ sndngTelno: '1'.repeat(14), rcptnTelno: '010-1234-5678', sndngCn: '문자' }).success).toBe(false);
    expect(smsSchema.safeParse({ sndngTelno: '02-1234-5678', rcptnTelno: '010-1234-56789', sndngCn: '문자' }).success).toBe(false);
    expect(smsSchema.safeParse({ sndngTelno: '02-1234-5678', rcptnTelno: '010-ABCD-1234', sndngCn: '문자' }).success).toBe(false);
    expect(smsSchema.safeParse({ sndngTelno: '02-1234-5678', rcptnTelno: '010-1234-5678', sndngCn: '가'.repeat(81) }).success).toBe(false);
  });

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

  /*
    [2026-10-07] 메뉴 케이스를 걷었다. 대상이던 menuSchema 는 어떤 화면도 쓰지 않았다. 메뉴 쓰기 화면(보드 + 인스펙터,
    DEC-OPS-209)은 menuDraft.ts 의 validateMenuFields 로 이름 필수·100자, 경로 형식·500자, 설명 4000자를 막고,
    그 상한은 생성 계약 MenuPropertiesRequestSchema 에서 읽는다 — menuDraft.test.ts 가 같은 경계를 검증한다.
    정렬 순서는 사용자가 입력하지 않고 보드 위치에서 계산하며, 사용 여부는 Y/N 두 값만 낸다(menuUseValue).
  */
});
