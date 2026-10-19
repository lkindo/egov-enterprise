'use client';

import { useMemo } from 'react';
import type { InformalSanctionDto } from '@/services/business/user/approval/ApprovalUserService';
import type { ApprovalTab } from '@/queries/approval-query-options';
import { EMPTY_APPROVALS, sanctionKey } from './approval-hub-model';

/**
 * 여러 건 승인의 대상과 묶음(2026-10-18 허브 분해 때 ApprovalHubClient 에서 옮겼다 — 판정 그대로). 고른 목록(bulkSelected)은 허브의
 * 상태다. 실제로 보내는 문서(bulkTargets)는 지금 승인할 수 있는 것과 고른 것의 교집합이다.
 */
export function useApprovalBulkSelection({ activeTab, canApprovePermission, list, queued, committingIds, bulkSelected }: {
  activeTab: ApprovalTab;
  canApprovePermission: boolean;
  list: InformalSanctionDto[];
  queued: number[];
  committingIds: number[];
  bulkSelected: string[];
}) {
  // 여러 건 승인 — 대기함에서 서버가 승인할 수 있다고 한 문서만, 보완 요청이 열려 있지 않고 대기열에 없으며 보내는 중도 아닌 것만.
  //   의존값(목록·대기열 스냅샷·보내는 중 상태)은 바뀔 때만 새 배열이 되므로, 메모해 두어야 아래 taskGroups 메모가 실제로 캐시된다.
  const bulkEligible = useMemo(() => (activeTab === 'PENDING' && canApprovePermission
    ? list.filter(item => item.canApprove && !item.openSupplement && item.ifmlAtrzSn !== undefined
      && !queued.includes(item.ifmlAtrzSn) && !committingIds.includes(item.ifmlAtrzSn))
    : EMPTY_APPROVALS), [activeTab, canApprovePermission, list, queued, committingIds]);
  const taskGroups = useMemo(() => {
    const groups = new Map<string, { label: string; keys: string[] }>();
    bulkEligible.forEach((item) => {
      const code = item.taskSeCd ?? '';
      const group = groups.get(code) ?? { label: item.taskSeNm || item.taskSeCd || '업무 구분 없음', keys: [] };
      group.keys.push(sanctionKey(item));
      groups.set(code, group);
    });
    return [...groups.values()].filter(group => group.keys.length > 1);
  }, [bulkEligible]);
  const bulkTargets = bulkEligible.filter(item => bulkSelected.includes(sanctionKey(item)));
  const visibleBulkSelected = bulkTargets.map(sanctionKey);
  return { bulkEligible, taskGroups, bulkTargets, visibleBulkSelected };
}
