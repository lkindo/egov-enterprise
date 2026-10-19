'use client';

import { RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UserManage } from '@/types/foundation/user';
import type { UserStatusCode } from '@/services/foundation/system/UserAdminService';
import { BulkUserDepartmentDialog, BulkUserStatusDialog } from './UserBulkActionDialogs';
import type { useDeptTree } from './useDeptTree';

/*
 * 사용자 일괄 상태 변경·부서 이동 대화상자와 그 실행 단추(2026-10-18 허브 분해 때 UserOrgHubClient 에서 옮겼다 — 마크업·문구·
 * 비활성 조건 그대로). 실행(쓰기)은 허브가 소유하고 handleBulkStatusUpdate·handleBulkDeptMove 로 넘긴다. locked 는 허브의 쓰기
 * 잠금(진행 중인 쓰기가 하나라도 있다)이고 applyBusy·moveBusy 는 그 쓰기가 이 실행인가다 — 폼 검증 census 가 넘겨받은 처리기와
 * 단추를 이 이름으로 잇는다.
 */

export function UserOrgBulkStatusDialog({ isOpen, users, locked, applyBusy, onClose, status, onStatusChange, handleBulkStatusUpdate }: {
  isOpen: boolean;
  users: UserManage[];
  /** 진행 중인 쓰기가 있다(허브의 쓰기 잠금). */
  locked: boolean;
  /** 진행 중인 쓰기가 상태 일괄 적용이다. */
  applyBusy: boolean;
  onClose: () => void;
  status: UserStatusCode;
  onStatusChange: (status: UserStatusCode) => void;
  handleBulkStatusUpdate: () => Promise<void>;
}) {
  return (
      <BulkUserStatusDialog
        isOpen={isOpen}
        users={users}
        isSaving={locked}
        onClose={onClose}
        status={status}
        onStatusChange={onStatusChange}
        footer={
          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <Button type="button" variant="outline" disabled={locked} onClick={onClose}>
              취소
            </Button>
            <Button
              onClick={() => void handleBulkStatusUpdate()}
              disabled={locked || applyBusy}
              aria-busy={applyBusy || undefined}
              className="gap-1.5"
            >
              {applyBusy ? (
                <><RefreshCcw size={14} className="animate-spin" aria-hidden="true" /> 상태 일괄 적용 중…</>
              ) : '상태 일괄 적용'}
            </Button>
          </div>
        }
      />
  );
}

export function UserOrgBulkMoveDialog({
  isOpen, users, locked, moveBusy, onClose, departments, isLoading, departmentId, onDepartmentChange, handleBulkDeptMove,
}: {
  isOpen: boolean;
  users: UserManage[];
  /** 진행 중인 쓰기가 있다(허브의 쓰기 잠금). */
  locked: boolean;
  /** 진행 중인 쓰기가 부서 이동 실행이다. */
  moveBusy: boolean;
  onClose: () => void;
  departments: ReturnType<typeof useDeptTree>['flattenedDepts'];
  isLoading: boolean;
  departmentId: string;
  onDepartmentChange: (departmentId: string) => void;
  handleBulkDeptMove: () => Promise<void>;
}) {
  return (
      <BulkUserDepartmentDialog
        isOpen={isOpen}
        users={users}
        isSaving={locked}
        onClose={onClose}
        departments={departments}
        isLoading={isLoading}
        departmentId={departmentId}
        onDepartmentChange={onDepartmentChange}
        footer={
          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <Button type="button" variant="outline" disabled={locked} onClick={onClose}>
              취소
            </Button>
            <Button
              onClick={() => void handleBulkDeptMove()}
              disabled={locked || moveBusy}
              aria-busy={moveBusy || undefined}
              className="gap-1.5"
            >
              {moveBusy ? (
                <><RefreshCcw size={14} className="animate-spin" aria-hidden="true" /> 부서 이동 실행 중…</>
              ) : '부서 이동 실행'}
            </Button>
          </div>
        }
      />
  );
}
