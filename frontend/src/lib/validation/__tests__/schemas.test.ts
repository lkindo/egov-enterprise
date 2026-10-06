import { describe, it, expect } from 'vitest';
import { smsSchema, smsRecipientNumberSchema } from '../schemas';

/*
  [2026-10-07] pollSchema·menuSchema describe 를 걷었다. 두 스키마는 테스트만 import 했고, 실제 쓰기 화면은
  투표가 admin/survey/manage/poll-form-validation.ts(pollFormSchema·adminPollFormSchema, 그 옆 테스트가 검증),
  메뉴가 admin/system/menus/menuDraft.ts 의 validateMenuFields(menuDraft.test.ts 가 검증)를 쓴다.
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
