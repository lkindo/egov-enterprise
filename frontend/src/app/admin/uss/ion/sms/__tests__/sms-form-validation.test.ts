import { describe, it, expect } from 'vitest';
import { smsSchema, smsRecipientNumberSchema } from '../sms-form-validation';

/*
  문자 발송 폼 스키마의 계약 — 문자 기능 소유(Phase 2 10단계 10c-1). 종전 공유 위치(lib/validation/__tests__)의 schemas.test.ts 와
  sms-manual-menu-contracts.test.ts 의 문자 사례를 스키마와 함께 옮겼다. 문자를 고르지 않은 구성에서는 스키마와 함께 빠진다.
*/
describe('Standardized Validation Schemas', () => {

  describe('smsSchema (SMS)', () => {
    it('하이픈 입력을 선행 0이 보존된 11자리 수신번호로 정규화한다', () => {
      expect(smsRecipientNumberSchema.parse(' 010-1234-5678 ')).toBe('01012345678');
      expect(smsRecipientNumberSchema.parse('01012345678')).toBe('01012345678');
      expect(smsRecipientNumberSchema.parse('0101')).toBe('0101');
    });

    it.each(['---', '   ', '010123456789', '010ABC45678', '+82-10-1234-5678'])(
      '잘못된 수신번호 %s는 전송 전에 거부한다', (number) => {
        expect(smsRecipientNumberSchema.safeParse(number).success).toBe(false);
      },
    );

    it('should validate message length within 80 chars', () => {
      const validData = {
        sndngTelno: '010-1234-5678',
        rcptnTelno: '010-5678-1234',
        sndngCn: '안녕하세요. 테스트 메시지입니다.',
      };
      const result = smsSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject message longer than 80 chars', () => {
      const longMessage = 'A'.repeat(81);
      const invalidData = {
        sndngTelno: '010-1234-5678',
        rcptnTelno: '010-5678-1234',
        sndngCn: longMessage,
      };
      const result = smsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issues = result.error.issues;
        expect(issues.length).toBeGreaterThan(0);
        expect(issues[0].code).toBe('too_big');
      }
    });
  });

});

describe('SMS write-boundary contracts', () => {
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
});
