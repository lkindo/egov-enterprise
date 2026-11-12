import { executeGeneratedOperation } from '@/lib/api/generated-api-client';
import {
  approveOperatorMemberOperation,
  designateOperatorOperation,
  getOperatorMembersOperation,
  rejectOperatorMemberOperation,
  updateOperatorProfileOperation,
  withdrawOperatorMemberOperation,
} from '@/types/generated-operations';

/**
 * 커뮤니티 운영자 서비스(GAP-CMTY-001, DEC-OPS-416). 소속 커뮤니티의 승인 회원이면서 운영자(mngrYn=Y)인 사람만 서버가 받아 준다 —
 * 다른 커뮤니티나 운영자가 아닌 회원의 요청은 403 이다. 회원 식별자는 esntlId 축이다(tb_cmnty_user_map.user_id).
 */
interface Page<T> {
  list: T[];
  total: number;
}

export interface OperatorMember {
  userId: string;
  userNm?: string | null;
  mbrSttsCd?: string | null;
  status?: string | null;
  mngrYn?: string | null;
  joinYmd?: string | null;
  whdwlYmd?: string | null;
}

/** 서버 상태 코드(A 신청·P 회원·W 탈퇴). 비우면 전체. */
export type OperatorMemberStatusCode = 'A' | 'P' | 'W';

export const communityOperatorService = {
  getMembers: async (cmntySn: number, params: { status?: OperatorMemberStatusCode; page?: number; size?: number } = {}) =>
    executeGeneratedOperation(getOperatorMembersOperation, { path: { cmntySn }, query: params }) as Promise<Page<OperatorMember>>,
  approve: async (cmntySn: number, userId: string) =>
    executeGeneratedOperation(approveOperatorMemberOperation, { path: { cmntySn, userId } }),
  reject: async (cmntySn: number, userId: string) =>
    executeGeneratedOperation(rejectOperatorMemberOperation, { path: { cmntySn, userId } }),
  withdraw: async (cmntySn: number, userId: string) =>
    executeGeneratedOperation(withdrawOperatorMemberOperation, { path: { cmntySn, userId } }),
  designate: async (cmntySn: number, userId: string, manager: boolean) =>
    executeGeneratedOperation(designateOperatorOperation, { path: { cmntySn, userId }, body: { manager } }),
  updateProfile: async (cmntySn: number, profile: { cmntyNm: string; cmntyIntroCn?: string; version: number }) =>
    executeGeneratedOperation(updateOperatorProfileOperation, { path: { cmntySn }, body: profile }),
};
