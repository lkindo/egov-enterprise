import { describe, expect, it } from 'vitest';
import {
  InstitutionCodeDtoSchema,
  InstitutionCodeRecptnDtoSchema,
  MenuDtoSchema,
} from '@/types/generated-zod';

describe('보류 표준 설계의 생성 API 계약', () => {
  // [2026-10-04 프로그램 목록 퇴역] ProgramDto 를 걷었다.
  // [2026-10-05] 앱이 메뉴의 연결 프로그램 컬럼을 더 이상 매핑하지 않아 요청·응답에서 그 필드를 걷었다(GAP-PROGRAM-001).
  //   필드가 다시 생기면 메뉴를 이미 퇴역한 프로그램 원장에 잇는 경로가 열린다.
  it('메뉴 계약에는 연결 프로그램 필드가 없다', () => {
    expect(Object.keys(MenuDtoSchema.shape)).not.toContain('prgrmFileNm');
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
