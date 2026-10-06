'use client';

import type { ReactNode } from 'react';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { cn } from '@/lib/utils';
import type { UserManage } from '@/types/foundation/user';
import type { UserStatusCode } from '@/services/foundation/system/UserAdminService';
import type { FlattenedDept } from './departments/treeUtils';
import { BulkSelectionSummary } from './UserOrgHubParts';

const USER_STATUSES = [
  { code: 'P', label: '정상', dot: 'bg-success' },
  { code: 'A', label: '승인 대기', dot: 'bg-warning' },
  { code: 'D', label: '비활성', dot: 'bg-muted-foreground' },
] satisfies { code: UserStatusCode; label: string; dot: string }[];

interface BulkDialogProps {
  isOpen: boolean;
  users: UserManage[];
  isSaving: boolean;
  onClose: () => void;
  footer: ReactNode;
}

export function BulkUserStatusDialog({
  isOpen, users, isSaving, onClose, footer, status, onStatusChange,
}: BulkDialogProps & {
  status: UserStatusCode;
  onStatusChange: (status: UserStatusCode) => void;
}) {
  return (
    <StandardModal isOpen={isOpen} onClose={onClose} title="사용자 상태 일괄 변경" maxWidth="sm">
      <div className="space-y-4">
        <BulkSelectionSummary users={users} />
        <div className="space-y-2">
          <p id="bulk-status-label" className="text-[length:var(--font-size-body)] font-semibold text-foreground">변경할 상태 선택</p>
          <div role="radiogroup" aria-labelledby="bulk-status-label" className="grid grid-cols-1 gap-1.5">
            {USER_STATUSES.map(({ code, label, dot }) => (
              <button
                key={code}
                type="button"
                role="radio"
                aria-checked={status === code}
                disabled={isSaving}
                onClick={() => onStatusChange(code)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors',
                  status === code ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted',
                )}
              >
                <span className={cn('size-2 shrink-0 rounded-full', dot)} aria-hidden="true" />
                <span className="text-[length:var(--font-size-body)] font-medium text-foreground">{label}</span>
              </button>
            ))}
          </div>
        </div>
        {footer}
      </div>
    </StandardModal>
  );
}

export function BulkUserDepartmentDialog({
  isOpen, users, isSaving, onClose, footer, departments, isLoading, departmentId, onDepartmentChange,
}: BulkDialogProps & {
  departments: FlattenedDept[];
  isLoading: boolean;
  departmentId: string;
  onDepartmentChange: (departmentId: string) => void;
}) {
  return (
    <StandardModal isOpen={isOpen} onClose={onClose} title="부서 일괄 이동" maxWidth="md">
      <div className="space-y-4">
        <BulkSelectionSummary users={users} />
        <div className="space-y-2">
          <p id="bulk-dept-label" className="text-[length:var(--font-size-body)] font-semibold text-foreground">이동할 대상 부서 선택</p>
          <div role="radiogroup" aria-labelledby="bulk-dept-label" className="max-h-[320px] overflow-y-auto rounded-md border border-border bg-muted/20 p-2">
            {departments.length === 0 && (
              <p className="py-8 text-center text-[length:var(--font-size-body)] text-muted-foreground">
                {isLoading ? '부서 목록을 불러오는 중입니다...' : '이동할 수 있는 부서가 없습니다.'}
              </p>
            )}
            {departments.map((node) => (
              <div key={node.ognzId} style={{ paddingLeft: `${node.depth * 16}px` }}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={departmentId === node.ognzId}
                  disabled={isSaving}
                  onClick={() => onDepartmentChange(node.ognzId || '')}
                  className={cn(
                    'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors',
                    departmentId === node.ognzId ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted',
                  )}
                >
                  <span className="min-w-0 truncate text-[length:var(--font-size-body)]">{node.ognzNm}</span>
                  <span className="ml-auto shrink-0 text-xs tabular-nums opacity-70">{node.ognzId}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
        {footer}
      </div>
    </StandardModal>
  );
}
