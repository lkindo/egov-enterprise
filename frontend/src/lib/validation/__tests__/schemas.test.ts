import { describe, it, expect } from 'vitest';
import { pollSchema, smsSchema, smsRecipientNumberSchema, menuSchema } from '../schemas';

describe('Standardized Validation Schemas', () => {
  
  describe('pollSchema (Survey)', () => {
    it('should validate correct poll data', () => {
      const validData = {
        pollNm: '2024 하반기 설문',
        pollBgngYmd: '20240101',
        pollEndYmd: '20241231',
        pollKndCd: '001',
      };
      const result = pollSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty title', () => {
      const invalidData = {
        pollNm: '',
        pollBgngYmd: '20240101',
        pollEndYmd: '20241231',
        pollKndCd: '001',
      };
      const result = pollSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issues = result.error.issues;
        expect(issues.length).toBeGreaterThan(0);
        expect(issues[0].code).toBe('too_small');
      }
    });

    it('should reject if end date is before start date', () => {
      const invalidData = {
        pollNm: '날짜 오류 테스트',
        pollBgngYmd: '20241231',
        pollEndYmd: '20240101',
        pollKndCd: '001',
      };
      const result = pollSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issues = result.error.issues;
        expect(issues.length).toBeGreaterThan(0);
        expect(issues[0].message).toBe('종료일은 시작일보다 빠를 수 없습니다.');
      }
    });
  });

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

  describe('menuSchema (Menu Management)', () => {
    it('should allow a missing menu number when the DB generates it', () => {
      const result = menuSchema.safeParse({ menuNm: 'Generated Menu', menuOrdr: 1 });
      expect(result.success).toBe(true);
    });

    it('should validate correct menu numbers and order', () => {
      const validData = {
        menuNo: '1001',
        menuNm: 'Dashboard',
        prgrmFileNm: 'DashboardSvc.js',
        menuOrdr: 1,
      };
      const result = menuSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should coerce string order to number', () => {
      const dataWithStingOrder = {
        menuNo: '1001',
        menuNm: 'Dashboard',
        prgrmFileNm: 'DashboardSvc.js',
        menuOrdr: '10',
      };
      const result = menuSchema.safeParse(dataWithStingOrder);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.menuOrdr).toBe('number');
        expect(result.data.menuOrdr).toBe(10);
      }
    });
  });

});
