import { describe, expect, it } from 'vitest';

import { manualSchema, menuSchema, smsSchema } from '@/lib/validation/schemas';

describe('SMS, manual, and menu write-boundary contracts', () => {
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
        rcptnTelno: '010-1234-5678',
        sndngCn: '전송할 문자',
      });
    }

    expect(smsSchema.safeParse({ sndngTelno: '1'.repeat(14), rcptnTelno: '010-1234-5678', sndngCn: '문자' }).success).toBe(false);
    expect(smsSchema.safeParse({ sndngTelno: '02-1234-5678', rcptnTelno: 'A'.repeat(21), sndngCn: '문자' }).success).toBe(false);
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

  it('keeps generated menu string limits and Java Integer order boundaries', () => {
    const valid = {
      menuNm: '메뉴',
      menuOrdr: 1,
      prgrmFileNm: 'Program.tsx',
      modernRoute: '/admin/menu',
      menuExpln: '설명',
      useYn: 'Y' as const,
    };
    expect(menuSchema.safeParse(valid).success).toBe(true);
    expect(menuSchema.safeParse({ ...valid, menuNm: '   ' }).success).toBe(false);
    expect(menuSchema.safeParse({ ...valid, menuNm: '가'.repeat(101) }).success).toBe(false);
    expect(menuSchema.safeParse({ ...valid, prgrmFileNm: 'a'.repeat(101) }).success).toBe(false);
    expect(menuSchema.safeParse({ ...valid, modernRoute: 'a'.repeat(501) }).success).toBe(false);
    expect(menuSchema.safeParse({ ...valid, menuExpln: '가'.repeat(4001) }).success).toBe(false);
    expect(menuSchema.safeParse({ ...valid, menuOrdr: 1.5 }).success).toBe(false);
    expect(menuSchema.safeParse({ ...valid, menuOrdr: 2147483648 }).success).toBe(false);
    expect(menuSchema.safeParse({ ...valid, menuOrdr: -2147483649 }).success).toBe(false);
    expect(menuSchema.safeParse({ ...valid, useYn: 'X' }).success).toBe(false);
  });
});
