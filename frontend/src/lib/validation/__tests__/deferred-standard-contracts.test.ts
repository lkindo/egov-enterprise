import { describe, expect, it } from 'vitest';
import {
  InstitutionCodeDtoSchema,
  InstitutionCodeRecptnDtoSchema,
  MenuDtoSchema,
} from '@/types/generated-zod';

describe('보류 표준 설계의 생성 API 계약', () => {
  // [2026-10-04 프로그램 목록 퇴역] ProgramDto 를 걷었다. 메뉴의 연결 프로그램 컬럼(300자)은 DB 에 남으므로 그 길이 계약은 남긴다.
  it('메뉴의 연결 프로그램은 300자를 허용하고 301자는 거부한다', () => {
    const schema = MenuDtoSchema.shape.prgrmFileNm;
    expect(schema.safeParse('가'.repeat(300)).success).toBe(true);
    expect(schema.safeParse('가'.repeat(301)).success).toBe(false);
  });

  it('기관코드와 수신 로그는 유효한 HHmmss를 같은 규칙으로 검증한다', () => {
    for (const schema of [InstitutionCodeDtoSchema.shape.chgTm, InstitutionCodeRecptnDtoSchema.shape.chgTm]) {
      for (const value of [undefined, '000000', '143025', '235959']) {
        expect(schema.safeParse(value).success, String(value)).toBe(true);
      }
      for (const value of ['', '240000', '126000', '125960', '14:30:25', '20260909143025', '１２３４５６']) {
        expect(schema.safeParse(value).success, value).toBe(false);
      }
    }
  });
});
