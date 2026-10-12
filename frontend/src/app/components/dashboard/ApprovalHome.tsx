'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { pendingApprovalCountQuery } from '@/queries/approval-home-query';

/**
 * 업무 홈의 결재 조각(Phase 2 9단계 — 종전 UnifiedDashboardClient 의 결재 블록을 옮겼다). 결재 기능 소유이고 업무 홈 셸에는
 * home-sections 기여(extensions/informalsanction/home-sections.ts)로 들어간다. 노출은 결재 조회 권한(APPROVAL_READ)이다 — 대기 수를
 * 결재 API 로 세므로 그 권한이 없으면 셀 수 없다(사용자 결정 B5).
 */

/**
 * [2026-09-15 DEC-OPS-100] 셀 수 없는 결재 대기를 0건으로 말하지 않는다(unknownAsZero). 대기 수 조회가 실패해도 업무 홈 전체를
 * 오류 화면으로 바꾸지 않는다 — 종전 대시보드 응답의 결재 대기 null 과 같이 이 카드만 '조회 실패' 라고 말한다.
 */
export function ApprovalPendingCard() {
  const pending = useQuery({ ...pendingApprovalCountQuery, throwOnError: false });
  const total = pending.data?.total;
  const value = pending.isPending ? '확인 중' : pending.isError || typeof total !== 'number' ? '조회 실패' : `${total}건`;
  return (
    <li className="rounded-md border border-border bg-card px-4 py-3">
      <Link href="/approvals" className="group block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <span className="text-[length:var(--font-size-body)] text-muted-foreground group-hover:text-primary">결재 대기</span>
        <span className="mt-1 block text-2xl font-bold tabular-nums text-foreground">{value}</span>
      </Link>
    </li>
  );
}

export function ApprovalOpenAction() {
  return (
    <Button asChild size="sm">
      <Link href="/approvals">결재함 열기</Link>
    </Button>
  );
}
