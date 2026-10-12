import { describe, expect, it } from 'vitest';

import { administCodeSchema } from '@/app/admin/system/codes/administ/AdministCodeClient';
import { authorizationGroupFormSchema } from '@/lib/auth/authorization-management-contract';
import { createUserSchema, userSchema } from '@/components/admin/user/UserManageForm';

/*
  core 폼 스키마만 둔다(Phase 2 10단계 10c-1). 기능 폼(배너·팝업, 투표, 온라인 매뉴얼)의 사례는 그 기능 소유 시험으로 옮겼다 — 이 파일이
  기능 모듈을 import 하면 그 기능을 고르지 않은 생성물에서 아래 core 사례까지 연쇄로 빠진다.
*/
describe('generated DTO constraints stay attached to form schemas', () => {
  it('keeps canonical group physical lengths while adding required rules', () => {
    expect(authorizationGroupFormSchema.safeParse({ code: 'A'.repeat(21), name: '관리자', description: '' }).success).toBe(false);
    expect(authorizationGroupFormSchema.safeParse({ code: 'ADMIN', name: '가'.repeat(101), description: '' }).success).toBe(false);
    expect(authorizationGroupFormSchema.safeParse({
      code: 'ADMIN',
      name: '관리자',
      description: '가'.repeat(4001),
    }).success).toBe(false);
  });

  // [2026-10-04 프로그램 목록 퇴역] ProgramForm(programFormSchema)과 ProgramDto 를 걷어 그 길이 보존 사례도 걷었다(대상 소멸).

  it('keeps user id, name, contact, organization, and password constraints', () => {
    const validUser = { userId: 'user_1', userNm: '홍길동', pswd: '' };

    expect(userSchema.safeParse({ ...validUser, userId: 'a'.repeat(21) }).success).toBe(false);
    expect(userSchema.safeParse({ ...validUser, userId: 'invalid-id!' }).success).toBe(false);
    expect(userSchema.safeParse({ ...validUser, userNm: '가'.repeat(51) }).success).toBe(false);
    expect(userSchema.safeParse({ ...validUser, emlAddr: 'not-an-email' }).success).toBe(false);
    expect(userSchema.safeParse({ ...validUser, mblTelno: '1'.repeat(12) }).success).toBe(false);
    expect(userSchema.safeParse({ ...validUser, ognzId: 'A'.repeat(21) }).success).toBe(false);
    expect(userSchema.safeParse(validUser).success).toBe(true);
    expect(userSchema.safeParse({ ...validUser, pswd: 'abcdefgh' }).success).toBe(false);
    expect(userSchema.safeParse({ ...validUser, pswd: `${'Aa1!'.repeat(25)}X` }).success).toBe(false);
    expect(createUserSchema.safeParse(validUser).success).toBe(false);
    expect(createUserSchema.safeParse({ ...validUser, pswd: 'Password1!' }).success).toBe(true);
  });

  // [2026-10-07] 화면이 쓰지 않던 menuSchema·userManageSchema 사례를 걷었다. 메뉴 속성의 생성 상한은 menuDraft.test.ts 가,
  //   사용자 비밀번호 규칙은 위 userSchema 사례가 같은 축을 본다. 투표(pollFormSchema)·온라인 매뉴얼(manualSchema) 사례는
  //   [10단계 10c-1] 각 기능 소유 시험(survey/manage/__tests__/poll-form-validation·uss/olh/online-manual/__tests__)으로 옮겼다.

  it('keeps administrative-code max lengths', () => {
    const validCode = {
      admdstCd: '1234567890',
      admdstZoneNm: '서울특별시',
      admdstSeCd: '1',
      upAdmdstCd: '0',
      useYn: 'Y',
    };

    expect(administCodeSchema.safeParse({ ...validCode, admdstZoneNm: '가'.repeat(101) }).success).toBe(false);
    expect(administCodeSchema.safeParse({ ...validCode, admdstSeCd: '1'.repeat(13) }).success).toBe(false);
    expect(administCodeSchema.safeParse({ ...validCode, upAdmdstCd: '1'.repeat(13) }).success).toBe(false);
    expect(administCodeSchema.safeParse({ ...validCode, useYn: 'YN' }).success).toBe(false);
  });

  // [2026-09-06 DEC-OPS-040] 약식 결재 화면(IsmClient·ismSchema)은 /approvals 로 통합돼 사라졌다. 결재 반려 사유의
  //   길이·필수 계약은 정본 결재 허브의 계약 테스트(frontend/src/app/approvals/__tests__)가 맡는다.
  // [10단계 10c-1] 배너·팝업 생성 길이 사례는 홍보 소유 시험(admin/system/banner/__tests__/banner-generated-constraints)으로 옮겼다.
});
