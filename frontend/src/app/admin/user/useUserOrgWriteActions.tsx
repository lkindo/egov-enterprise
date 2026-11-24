'use client';

import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Activity, Network, UserMinus } from 'lucide-react';
import { userAdminService } from '@/services/foundation/system/UserAdminService';
import { UserManage } from '@/types/foundation/user';
import { deptAdminService, Department } from '@/services/foundation/system/DeptAdminService';
import {
  ABSENT,
  PRESENT,
  userAbsenceAdminService,
} from '@/services/foundation/system/UserAbsenceAdminService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { saveDeptHierarchyAction } from '@/app/actions/deptActions';
import {
  bulkUpdateUserStatusAction,
  bulkMoveUserDeptAction,
  bulkDeleteUsersAction
} from '@/app/actions/userActions';
import { failureMessage } from '@/lib/safe-error-log';
import { USER_DELETE_CONSEQUENCE, type UserOrgWriteOperation } from './user-org-hub-model';
import type { useUserOrgDialogs } from './useUserOrgDialogs';
import type { useDeptTree } from './useDeptTree';

/*
 * [2026-11-25 품질 평가 3순위 12] 사용자·조직 허브(UserOrgHubClient)의 쓰기 잠금과 상세·일괄 쓰기 동작을 이 파일로 옮겼다 — 본문은
 * 그대로다. 폼 검증 census 가 허브의 단추에서 구조 분해한 처리기를 이 훅 본문까지 따라가 쓰기·동기 잠금·처리 중 표시를 같은 근거로
 * 읽는다. 쓰기 단추를 보이는 권한 판정(useUserOrgPermissions)은 허브에 둔다 — operation 소비 census 축 3 은 이 훅을 가져오는 허브가
 * 그 권한을 언급하면 통과로 본다.
 */

/**
 * 쓰기 잠금 — 폼 제출과 상세·일괄 동작이 한 번에 하나만 진행한다. 동기 ref(actionRequestRef)로 같은 tick 의 연속 클릭을 막고,
 * 화면 표시는 activeWriteOperation(무엇이 진행 중인가)으로 한다.
 */
export function useUserOrgWriteLock() {
  const [activeWriteOperation, setActiveWriteOperation] = useState<UserOrgWriteOperation | null>(null);
  const actionRequestRef = useRef<UserOrgWriteOperation | null>(null);
  const isSaving = activeWriteOperation !== null;

  const beginNonFormAction = (operation: UserOrgWriteOperation) => {
    if (actionRequestRef.current) return false;
    actionRequestRef.current = operation;
    setActiveWriteOperation(operation);
    return true;
  };

  const finishNonFormAction = (operation: UserOrgWriteOperation) => {
    if (actionRequestRef.current !== operation) return;
    actionRequestRef.current = null;
    setActiveWriteOperation(null);
  };

  return { activeWriteOperation, actionRequestRef, isSaving, beginNonFormAction, finishNonFormAction };
}

/**
 * 상세·일괄 쓰기 동작 — 부재·복귀, 계정 잠금 해제, 사용자·부서 삭제, 일괄 삭제·상태 변경·부서 이동, 조직 계층 저장. 모두 위의
 * 쓰기 잠금을 지난다. 실패는 서버 문구로 알리고 화면 상태를 지운다(토스트 하나).
 */
export function useUserOrgWriteActions({
  lock,
  selectedItemId,
  setSelectedItemId,
  selectedItem,
  selectedDept,
  absenceOf,
  refetchUsers,
  refetchDepts,
  dialogs,
  dept,
  permissions,
}: {
  lock: ReturnType<typeof useUserOrgWriteLock>;
  selectedItemId: string | number | null;
  setSelectedItemId: (value: string | number | null) => void;
  selectedItem: UserManage | Department | null;
  selectedDept: Department | undefined;
  absenceOf: (user: UserManage) => string | null;
  refetchUsers: () => unknown;
  refetchDepts: () => unknown;
  dialogs: ReturnType<typeof useUserOrgDialogs>;
  dept: Pick<ReturnType<typeof useDeptTree>, 'hasDeptChanges' | 'flattenedDepts' | 'baselineDepts' | 'markDeptChangesSaved'>;
  permissions: { canChangeUserStatus: boolean; canMoveUserDept: boolean; canDeleteUser: boolean };
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const { beginNonFormAction, finishNonFormAction, isSaving, activeWriteOperation } = lock;
  const { canChangeUserStatus, canMoveUserDept, canDeleteUser } = permissions;
  const { selectedBulkItems, targetStatus, targetDeptId, setIsBulkStatusModalOpen, setIsBulkMoveModalOpen, isDeptModalOpen } = dialogs;
  const { hasDeptChanges, flattenedDepts, baselineDepts, markDeptChangesSaved } = dept;

  const [absencePendingId, setAbsencePendingId] = useState<string | null>(null);
  const absencePendingRef = useRef(false);

  const handleToggleAbsence = async (user: UserManage) => {
    const esntlId = user?.esntlId;
    if (absencePendingRef.current || !esntlId) return;
    const current = absenceOf(user);
    if (current === null) return;
    const next = current === ABSENT ? PRESENT : ABSENT;

    absencePendingRef.current = true;
    setAbsencePendingId(esntlId);
    try {
      await userAbsenceAdminService.updateAbsence(esntlId, next);
      toast(
        next === ABSENT
          ? `${user.userNm ?? user.userId}님을 부재로 표시했습니다.`
          : `${user.userNm ?? user.userId}님을 복귀 처리했습니다.`,
        'success',
      );
      queryClient.invalidateQueries({ queryKey: ['admin-user-absences'] });
    } catch (error) {
      toast(failureMessage(error, '부재 상태를 변경하지 못했습니다.'), 'error');
    } finally {
      absencePendingRef.current = false;
      setAbsencePendingId(null);
    }
  };

  /**
   * [2026-09-26 DIP B4 P7, D5] 계정 잠금 해제. 연속 실패로 잠긴 계정은 잠금 시간이 지나면 스스로 풀리지만, 그 전에 풀어야 할 때
   * 관리자가 쓴다. 비밀번호 초기화도 잠금을 함께 푼다(서버).
   */
  const handleUnlockUser = async () => {
    const operation = 'unlock-user' as const;
    if (!selectedItemId || !beginNonFormAction(operation)) return;
    try {
      await userAdminService.unlockUser(selectedItemId as string);
      toast('계정 잠금을 해제했습니다.', 'success');
      await queryClient.invalidateQueries({ queryKey: ['admin-user-detail', selectedItemId] });
    } catch (error) {
      toast(failureMessage(error, '계정 잠금을 해제하지 못했습니다.'), 'error');
    } finally {
      finishNonFormAction(operation);
    }
  };

  /**
   * [V2_153] 강제 로그아웃. 대상의 모든 로그인 세션을 지금 끊는다 — 계정 상태·비밀번호는 그대로라 다시 로그인하면 들어온다. 확인 본문에
   * 대상과 결과를 밝힌다(누구의 무엇을 끊는지 모른 채 누르지 않게).
   */
  const handleForceLogout = async () => {
    const operation = 'force-logout' as const;
    if (!selectedItemId || !beginNonFormAction(operation)) return;
    try {
      const targetName = (selectedItem as UserManage)?.userNm ?? String(selectedItemId);
      const ok = await confirm({
        title: '강제 로그아웃',
        message: `'${targetName}(${selectedItemId})' 사용자의 모든 로그인 세션을 지금 끊습니다. 계정 상태와 비밀번호는 바뀌지 않아 다시 로그인할 수 있습니다.`,
        confirmText: '강제 로그아웃',
        cancelText: '취소',
        variant: 'destructive',
      });
      if (!ok) return;
      await userAdminService.forceLogout(selectedItemId as string);
      toast(`'${targetName}' 사용자의 세션을 끊었습니다.`, 'success');
    } catch (error) {
      toast(failureMessage(error, '강제 로그아웃하지 못했습니다.'), 'error');
    } finally {
      finishNonFormAction(operation);
    }
  };

  const handleDeleteUser = async () => {
    const operation = 'delete-user' as const;
    if (!selectedItemId || !beginNonFormAction(operation)) return;

    try {
      // 확인 본문에 대상 식별자(이름·아이디)를 노출한다 — 무엇을 지우는지 모른 채 누르는 오삭제 방지(감사 P1-9).
      const targetName = (selectedItem as UserManage)?.userNm ?? String(selectedItemId);
      const ok = await confirm({
        title: '사용자 삭제',
        // [2026-10-01] 삭제가 실제로 하는 일을 말한다 — 서버는 콘텐츠를 시스템 관리자로 재귀속하고 알림·멤버십·정책을 지운다.
        message: `'${targetName}(${selectedItemId})' 사용자의 계정과 접근 권한을 영구히 삭제합니다. ${USER_DELETE_CONSEQUENCE}`,
        variant: 'destructive',
        confirmText: '삭제'
      });

      if (ok) {
        await userAdminService.deleteUser(selectedItemId as string);
        toast(`'${targetName}' 사용자를 삭제했습니다.`, 'success');
        setSelectedItemId(null);
        refetchUsers();
      }
    } catch (error) {
      const message = failureMessage(error, '사용자 삭제 중 오류가 발생했습니다.');
      toast(message, 'error');
    } finally {
      finishNonFormAction(operation);
    }
  };

  /**
   * 부서 삭제. 종전에는 상세 패널의 삭제 버튼이 탭 분기 없이 handleDeleteUser 를 호출해,
   * DEPTS 탭에서는 부서 ID(ognzId)로 사용자 삭제 API 를 때리고 있었다.
   * 서버는 소속 사용자·하위 부서가 남아 있으면 409(RESOURCE_IN_USE)로 막으므로 그 메시지를 그대로 보여준다.
   */
  const handleDeleteDept = async () => {
    const operation = 'delete-dept' as const;
    if (!selectedItemId || !beginNonFormAction(operation)) return;

    try {
      const targetName = (selectedItem as Department)?.ognzNm ?? String(selectedItemId);
      const ok = await confirm({
        title: '부서 삭제',
        message: `'${targetName}(${selectedItemId})' 부서를 삭제하시겠습니까? 소속 사용자나 하위 부서가 남아 있으면 삭제할 수 없습니다.`,
        variant: 'destructive',
        confirmText: '삭제'
      });

      if (ok) {
        await deptAdminService.deleteDept(selectedItemId as string);
        toast(`'${targetName}' 부서를 삭제했습니다.`, 'success');
        setSelectedItemId(null);
        refetchDepts();
      }
    } catch (error) {
      const message = failureMessage(error, '부서 삭제 중 오류가 발생했습니다.');
      toast(message, 'error');
    } finally {
      finishNonFormAction(operation);
    }
  };

  const handleBulkDelete = async (items: (UserManage | Department)[]) => {
    const operation = 'bulk-delete' as const;
    if (!beginNonFormAction(operation)) return;
    const userItems = items as UserManage[];
    const names = userItems.map(u => u.userNm).filter(Boolean);
    const preview = names.slice(0, 5).join(', ') + (names.length > 5 ? ` 외 ${names.length - 5}명` : '');
    try {
      const ok = await confirm({
        title: '사용자 일괄 삭제',
        message: `${userItems.length}명의 계정과 접근 권한을 영구히 삭제합니다. ${USER_DELETE_CONSEQUENCE}\n대상: ${preview}`,
        variant: 'destructive',
        confirmText: '삭제'
      });
      if (ok) {
        const res = await bulkDeleteUsersAction(userItems.map(u => u.userId));
        toast(res.message, res.success ? 'success' : 'error');
        if (res.success) refetchUsers();
      }
    } catch (error) {
      toast(failureMessage(error, '일괄 삭제 중 오류가 발생했습니다.'), 'error');
    } finally {
      finishNonFormAction(operation);
    }
  };

  const handleBulkStatusUpdate = async () => {
    const operation = 'bulk-status' as const;
    if (!beginNonFormAction(operation)) return;
    try {
      const res = await bulkUpdateUserStatusAction(selectedBulkItems.map(u => u.userId), targetStatus);
      if (res.success) {
        toast(res.message, 'success');
        refetchUsers();
        setIsBulkStatusModalOpen(false);
      } else {
        toast(res.message, 'error');
      }
    } catch {
      toast('상태 변경 중 오류 발생', 'error');
    } finally {
      finishNonFormAction(operation);
    }
  };

  const handleBulkDeptMove = async () => {
    if (!targetDeptId) {
      toast('이동할 부서를 선택해주세요.', 'error');
      return;
    }
    const operation = 'bulk-move' as const;
    if (!beginNonFormAction(operation)) return;
    try {
      const res = await bulkMoveUserDeptAction(selectedBulkItems.map(u => u.userId), targetDeptId);
      if (res.success) {
        toast(res.message, 'success');
        refetchUsers();
        setIsBulkMoveModalOpen(false);
      } else {
        toast(res.message, 'error');
      }
    } catch {
      toast('부서 이동 중 오류 발생', 'error');
    } finally {
      finishNonFormAction(operation);
    }
  };

  const handleSaveDeptHierarchy = async () => {
    const operation = 'dept-hierarchy' as const;
    // A2 계약: 선택한 마스터 항목이 없거나 실제 변경이 없으면 저장하지 않는다.
    if (!selectedDept || !hasDeptChanges || isDeptModalOpen || !beginNonFormAction(operation)) return;

    try {
      // [DIP C5] 서버에서 읽은 기준선과 달라진 부서만, 형제 안 상대 순서로 보낸다.
      const res = await saveDeptHierarchyAction(flattenedDepts, baselineDepts);
      if (res.success) {
        toast(res.message, 'success');
        markDeptChangesSaved();
        // [2026-11-25 V2_155] 계층 저장은 옮긴 부서의 버전을 올린다 — 조직도 조회를 다시 받아야 이어서 연 편집 창이 새 버전을 보낸다
        //   (router.refresh 는 서버 초기 자료만 바꾸고 이미 받은 조회 캐시는 그대로 둔다).
        void queryClient.invalidateQueries({ queryKey: ['admin-depts'] });
        router.refresh();
      } else {
        toast(res.message, 'error');
      }
    } catch {
      toast('구조 저장 중 오류 발생', 'error');
    } finally {
      finishNonFormAction(operation);
    }
  };

  // 권한이 있는 일괄 작업만 싣는다. 하나도 없으면 표의 선택 체크박스도 걷는다(아래 enableSelection).
  const userBulkActions = [
    ...(canChangeUserStatus ? [{
      label: '상태 변경',
      icon: <Activity size={16} />,
      disabled: isSaving,
      onClick: (items: (UserManage | Department)[]) => dialogs.openBulkStatus(items as UserManage[]),
    }] : []),
    ...(canMoveUserDept ? [{
      label: '부서 이동',
      icon: <Network size={16} />,
      disabled: isSaving,
      onClick: (items: (UserManage | Department)[]) => dialogs.openBulkMove(items as UserManage[]),
    }] : []),
    ...(canDeleteUser ? [{
      label: '일괄 삭제',
      icon: <UserMinus size={16} />,
      variant: 'destructive' as const,
      disabled: isSaving,
      ariaBusy: activeWriteOperation === 'bulk-delete',
      pendingLabel: '일괄 삭제 처리 중…',
      onClick: handleBulkDelete
    }] : []),
  ];

  return {
    userBulkActions,
    absencePendingId,
    handleToggleAbsence,
    handleUnlockUser,
    handleForceLogout,
    handleDeleteUser,
    handleDeleteDept,
    handleBulkDelete,
    handleBulkStatusUpdate,
    handleBulkDeptMove,
    handleSaveDeptHierarchy,
  };
}
