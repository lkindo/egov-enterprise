import { describe, expect, it } from 'vitest';

import { getUsersOperation } from '@/types/generated-operations';
import { UserDtoResponseSchema } from '@/types/generated-zod';

/**
 * [2026-10-19 DEC-OPS-355] 관리자 사용자 목록은 휴대전화·이메일을 가린 값으로 온다.
 *
 * 목록이 등록·수정용 UserDto 를 그대로 내보내던 첫 구현은 그 입력 규칙(이메일 형식 @Pattern)이 응답 스키마에도 실려,
 * 가린 이메일(ho***@egov.kr)을 화면의 응답 검증이 거부했다 — 목록 전체가 사라지고 E2E 사용자 관리 여정만 붉었다.
 * 목록 응답은 입력 규칙이 없는 UserListItemDto 다. 이 시험은 생성된 getUsers 응답 스키마가 가린 행을 받는지 본다.
 */
describe('관리자 사용자 목록의 가린 연락처', () => {
  const maskedRow = {
    userId: 'e2e_user',
    userNm: 'E2E User',
    esntlId: 'USRCNFRM_00000000001',
    mblTelno: '010****5678',
    emlAddr: 'e2***@egov.kr',
    groups: ['ROLE_USER'],
    permissions: [],
    authorizationVersion: 'v1',
  };

  it('getUsers 응답 스키마가 가린 휴대전화·이메일 행을 받는다', () => {
    const page = { list: [maskedRow], total: 1, page: 0, size: 10, totalPage: 1 };

    expect(getUsersOperation.responseSchema?.safeParse(page).success).toBe(true);
  });

  it('입력 규칙을 가진 UserDto 응답 스키마는 같은 행을 거부한다(목록에 UserDto 를 되돌리면 안 되는 이유)', () => {
    expect(UserDtoResponseSchema.safeParse(maskedRow).success).toBe(false);
  });
});
