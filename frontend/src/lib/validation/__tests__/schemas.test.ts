import { describe, it, expect } from 'vitest';
import { pollSchema, smsSchema, menuSchema, boardMasterSchema } from '../schemas';

describe('Standardized Validation Schemas', () => {
  
  describe('pollSchema (Survey)', () => {
    it('should validate correct poll data', () => {
      const validData = {
        pollNm: '2024 하반기 설문',
        pollBgngYmd: '2024-01-01',
        pollEndYmd: '2024-12-31',
        pollKndCd: '001',
      };
      const result = pollSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty title', () => {
      const invalidData = {
        pollNm: '',
        pollBgngYmd: '2024-01-01',
        pollEndYmd: '2024-12-31',
        pollKndCd: '001',
      };
      const result = pollSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issues = result.error.issues;
        expect(issues.length).toBeGreaterThan(0);
        expect(issues[0].message).toBe('설문 주제는 필수입니다.');
      }
    });

    it('should reject if end date is before start date', () => {
      const invalidData = {
        pollNm: '날짜 오류 테스트',
        pollBgngYmd: '2024-12-31',
        pollEndYmd: '2024-01-01',
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
    it('should validate message length within 80 chars', () => {
      const validData = {
        trnsmitTelno: '010-1234-5678',
        recptnTelno: '010-5678-1234',
        trnsmitCn: '안녕하세요. 테스트 메시지입니다.',
      };
      const result = smsSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject message longer than 80 chars', () => {
      const longMessage = 'A'.repeat(81);
      const invalidData = {
        trnsmitTelno: '010-1234-5678',
        recptnTelno: '010-5678-1234',
        trnsmitCn: longMessage,
      };
      const result = smsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issues = result.error.issues;
        expect(issues.length).toBeGreaterThan(0);
        expect(issues[0].message).toBe('메시지는 80자 이내여야 합니다.');
      }
    });
  });

  describe('menuSchema (Menu Management)', () => {
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
