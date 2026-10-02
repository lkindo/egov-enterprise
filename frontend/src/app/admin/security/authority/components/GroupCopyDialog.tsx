'use client';

import { useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import type { AuthorizationGroupSnapshot } from '@/lib/auth/authorization-management-contract';
import { failureMessage } from '@/lib/safe-error-log';
import { authorizationAdminService } from '@/services/foundation/system/AuthorizationAdminService';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { useToast } from '@/app/components/ui/toast';
import { PROTECTED_PERMISSIONS } from '@/types/generated-screen-registry';
import { AuthorizationGroupForm } from './AuthorizationGroupForm';

/**
 * '이 그룹으로 새 그룹 만들기'(2026-10-02, 관리 콘솔 UX 2단계 A6). 원본의 **저장된** 기능권한·메뉴 표시를 새 그룹에 복사하고
 * 구성원은 복사하지 않는다(서버 계약). 원본이 그 사이 바뀌었으면 서버가 원본 버전으로 거부한다.
 *
 * 권한: 그룹 등록(AUTHRT_CREATE)과 권한 설정(AUTHRT_GRANT)이 모두 필요하다. 원본에 보호 권한이 있으면 권한 배정
 * (AUTHRT_ASSIGN)까지 필요하다 — 없으면 이유를 말하고 만들기를 막는다(서버도 거부한다).
 */
export function GroupCopyDialog({ source, onClose, onCopied }: {
  source: AuthorizationGroupSnapshot;
  onClose: () => void;
  /** 새 그룹을 만든 뒤(허브가 새 그룹을 고른다). */
  onCopied: (created: AuthorizationGroupSnapshot) => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copyPending, setCopyPending] = useState(false);
  const copyRequestRef = useRef(false);
  const canCopy = canPermission(user, 'AUTHRT_CREATE') && canPermission(user, 'AUTHRT_GRANT');
  const protectedCodes = source.grants.filter((grant) => grant.type === 'OPERATION' && (PROTECTED_PERMISSIONS as readonly string[]).includes(grant.code)).map((grant) => grant.code);
  const blockedByProtection = protectedCodes.length > 0 && !canPermission(user, 'AUTHRT_ASSIGN');
  const operationCount = source.grants.filter((grant) => grant.type === 'OPERATION').length;
  const navigationCount = source.grants.filter((grant) => grant.type === 'NAVIGATION').length;

  return (
    <StandardModal isOpen onClose={onClose} title="이 그룹으로 새 그룹 만들기" maxWidth="xl" closeDisabled={copyPending}>
      <div className="space-y-4">
        <p className="text-sm">원본: <strong>{source.name}</strong> <span className="text-muted-foreground">({source.code})</span> · 기능권한 {operationCount}개 · 메뉴 표시 {navigationCount}개</p>
        <p className="text-sm text-muted-foreground">원본의 저장된 기능권한과 메뉴 표시를 새 그룹에 그대로 복사합니다. 원본에서 저장하지 않은 변경과 구성원은 복사하지 않습니다.</p>
        {protectedCodes.length > 0 && <p role="status" className="text-sm text-muted-foreground">원본에 보호 권한({protectedCodes.join(', ')})이 있어, 복제하려면 권한 설정과 권한 배정 권한이 모두 필요합니다.</p>}
        {blockedByProtection && <p role="alert" className="text-sm text-destructive">지금 계정에는 권한 배정 권한이 없어 이 그룹을 복제할 수 없습니다.</p>}
        {!canCopy && <p role="alert" className="text-sm text-destructive">그룹을 만들려면 그룹 등록과 권한 설정 권한이 모두 필요합니다.</p>}
        <AuthorizationGroupForm creating labels={{ form: '권한 그룹 복제', submit: '새 그룹 만들기' }}
          initial={{ code: '', name: `${source.name} 사본`.slice(0, 100), description: source.description ?? '' }}
          externalBusy={copyPending || !canCopy || blockedByProtection}
          onSubmit={async (values) => {
            if (!canCopy || blockedByProtection || copyRequestRef.current) return;
            copyRequestRef.current = true; setCopyPending(true);
            try {
              const created = await authorizationAdminService.createGroupCopy(source.code, { ...values, sourceVersion: source.version });
              toast(`'${created.name}' 그룹을 만들었습니다. 구성원은 '구성원' 탭에서 추가하세요.`, 'success');
              onCopied(created);
            } catch (error) { toast(failureMessage(error, '그룹을 복제하지 못했습니다. 원본 그룹을 다시 조회해 주세요.'), 'error'); throw error; }
            finally { copyRequestRef.current = false; setCopyPending(false); }
          }} />
      </div>
    </StandardModal>
  );
}
