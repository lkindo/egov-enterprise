'use client';

import { useState, type RefObject } from 'react';
import type { UserManage } from '@/types/foundation/user';
import type { UserStatusCode } from '@/services/foundation/system/UserAdminService';
import type { UserOrgWriteOperation } from './user-org-hub-model';

/**
 * 사용자·조직 허브의 대화상자 상태(2026-10-18 허브 분해 때 UserOrgHubClient 에서 옮겼다 — 동작 변경 없음): 사용자·부서
 * 등록·수정 폼, 비밀번호 초기화, 일괄 상태 변경·부서 이동. 쓰기가 진행 중이면(actionRequestRef) 열거나 닫지 않는다.
 */
export function useUserOrgDialogs(actionRequestRef: RefObject<UserOrgWriteOperation | null>, selectedItemId: string | number | null) {
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  // Bulk Actions State
  const [selectedBulkItems, setSelectedBulkItems] = useState<UserManage[]>([]);
  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);
  const [isBulkMoveModalOpen, setIsBulkMoveModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<UserStatusCode>('P');
  const [targetDeptId, setTargetDeptId] = useState('');

  const handleOpenUserCreate = () => {
    if (actionRequestRef.current) return;
    setFormMode('create');
    setIsUserModalOpen(true);
  };

  const handleOpenDeptCreate = () => {
    if (actionRequestRef.current) return;
    setFormMode('create');
    setIsDeptModalOpen(true);
  };

  const handleOpenUserEdit = () => {
    if (actionRequestRef.current) return;
    setFormMode('edit');
    setIsUserModalOpen(true);
  };

  const handleOpenDeptEdit = () => {
    if (actionRequestRef.current) return;
    setFormMode('edit');
    setIsDeptModalOpen(true);
  };

  /**
   * [2026-09-05] 관리자 비밀번호 초기화. API(`PATCH /admin/system/users/{userId}/password`)와
   * `userAdminService.updatePassword` 는 있었지만 호출부가 0건이라, 비밀번호를 잊은 사용자를
   * UI 안에서 구제할 경로가 없었다(로그인 화면에는 비밀번호 찾기가 없다).
   */
  const handleOpenPasswordReset = () => {
    if (actionRequestRef.current || !selectedItemId) return;
    setIsPasswordModalOpen(true);
  };

  const handleClosePasswordModal = () => {
    if (actionRequestRef.current) return;
    setIsPasswordModalOpen(false);
  };

  const handleCloseUserModal = () => {
    if (actionRequestRef.current) return;
    setIsUserModalOpen(false);
  };

  const handleCloseDeptModal = () => {
    if (actionRequestRef.current) return;
    setIsDeptModalOpen(false);
  };

  const handleCloseBulkStatusModal = () => {
    if (actionRequestRef.current) return;
    setIsBulkStatusModalOpen(false);
  };

  const handleCloseBulkMoveModal = () => {
    if (actionRequestRef.current) return;
    setIsBulkMoveModalOpen(false);
  };

  /** 표에서 고른 사용자로 일괄 상태 변경·부서 이동 대화상자를 연다. */
  const openBulkStatus = (items: UserManage[]) => {
    if (actionRequestRef.current) return;
    setSelectedBulkItems(items);
    setIsBulkStatusModalOpen(true);
  };
  const openBulkMove = (items: UserManage[]) => {
    if (actionRequestRef.current) return;
    setSelectedBulkItems(items);
    setIsBulkMoveModalOpen(true);
  };

  return {
    isUserModalOpen,
    setIsUserModalOpen,
    isPasswordModalOpen,
    setIsPasswordModalOpen,
    isDeptModalOpen,
    setIsDeptModalOpen,
    formMode,
    selectedBulkItems,
    isBulkStatusModalOpen,
    setIsBulkStatusModalOpen,
    isBulkMoveModalOpen,
    setIsBulkMoveModalOpen,
    targetStatus,
    setTargetStatus,
    targetDeptId,
    setTargetDeptId,
    handleOpenUserCreate,
    handleOpenDeptCreate,
    handleOpenUserEdit,
    handleOpenDeptEdit,
    handleOpenPasswordReset,
    handleClosePasswordModal,
    handleCloseUserModal,
    handleCloseDeptModal,
    handleCloseBulkStatusModal,
    handleCloseBulkMoveModal,
    openBulkStatus,
    openBulkMove,
  };
}
