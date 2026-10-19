'use client';

import { KeyRound, LockOpen, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/*
 * 사용자·조직 허브 상세 머리의 동작 단추(2026-10-18 허브 분해 때 UserOrgHubClient 에서 옮겼다 — 마크업·문구·비활성 조건 그대로).
 *
 * 삭제(쓰기)는 허브가 소유하고 handleDeleteDept·handleDeleteUser 로 넘긴다. locked 는 허브의 쓰기 잠금(진행 중인 쓰기가 하나라도
 * 있다)이고, deleteBusy·unlockBusy 는 그 쓰기가 이 동작인가다 — 진행 중인 쓰기가 있으면 막고, 이 동작이면 aria-busy 다. 폼 검증
 * census 가 넘겨받은 처리기와 단추의 disabled·aria-busy 를 이 이름으로 잇는다(요소 하나가 넘기는 쓰기 처리기는 하나이고, 처리 중
 * 표시는 그 동작만의 것이어야 한다).
 */

export function DeptDetailActions({ canUpdateDept, canDeleteDept, locked, deleteBusy, onOpenEdit, handleDeleteDept }: {
  canUpdateDept: boolean;
  canDeleteDept: boolean;
  /** 진행 중인 쓰기가 있다(허브의 쓰기 잠금). */
  locked: boolean;
  /** 진행 중인 쓰기가 부서 삭제다. */
  deleteBusy: boolean;
  onOpenEdit: () => void;
  handleDeleteDept: () => Promise<void>;
}) {
  return (
    <>
      {canUpdateDept && (
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label="정보 수정"
        disabled={locked}
        onClick={onOpenEdit}
        className="gap-1.5"
      >
        <Pencil size={14} aria-hidden="true" /> 정보 수정
      </Button>
      )}
      {canDeleteDept && (
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={handleDeleteDept}
        disabled={locked || deleteBusy}
        aria-busy={deleteBusy || undefined}
        className="gap-1.5"
      >
        <Trash2 size={14} aria-hidden="true" />
        {deleteBusy ? '부서 삭제 중…' : '부서 삭제'}
      </Button>
      )}
    </>
  );
}

export function UserDetailActions({
  canUpdateUser,
  canResetPassword,
  canUnlock,
  canDeleteUser,
  locked,
  detailLoaded,
  unlockBusy,
  deleteBusy,
  onOpenEdit,
  onOpenPasswordReset,
  onUnlock,
  handleDeleteUser,
}: {
  canUpdateUser: boolean;
  canResetPassword: boolean;
  /** 잠긴 계정이고 계정 상태를 바꿀 권한이 있다. */
  canUnlock: boolean;
  canDeleteUser: boolean;
  /** 진행 중인 쓰기가 있다(허브의 쓰기 잠금). */
  locked: boolean;
  /** 상세 레코드가 왔다. 목록 행은 휴대전화·이메일을 가려서 싣으므로, 상세가 오기 전에는 수정을 열지 않는다(2026-10-18). */
  detailLoaded: boolean;
  /** 진행 중인 쓰기가 계정 잠금 해제다. */
  unlockBusy: boolean;
  /** 진행 중인 쓰기가 사용자 삭제다. */
  deleteBusy: boolean;
  onOpenEdit: () => void;
  onOpenPasswordReset: () => void;
  onUnlock: () => void;
  handleDeleteUser: () => Promise<void>;
}) {
  return (
    <>
      {/* 종전에는 같은 `handleOpenUserEdit` 를 부르는 버튼이 패널 우상단(아이콘)과 하단(CTA)에
          두 벌 있었다 — 같은 명령을 두 곳에 두면 어느 쪽이 무엇을 하는지 판정 비용만 는다(G10). */}
      {/* [2026-10-18] 상세 레코드가 오기 전에는 수정할 수 없다 — 목록 행은 휴대전화·이메일을 가려서 싣는다. 목록 값으로
          폼을 채우면 가린 값('010****5678')이 그대로 저장돼 원문을 덮는다. */}
      {canUpdateUser && (
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label="정보 수정"
        disabled={locked || !detailLoaded}
        onClick={onOpenEdit}
        className="gap-1.5"
      >
        <Pencil size={14} aria-hidden="true" /> 정보 수정
      </Button>
      )}
      {canResetPassword && (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onOpenPasswordReset}
        disabled={locked}
        className="gap-1.5"
      >
        <KeyRound size={14} aria-hidden="true" /> 비밀번호 초기화
      </Button>
      )}
      {canUnlock && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onUnlock}
          disabled={locked || unlockBusy}
          aria-busy={unlockBusy || undefined}
          className="gap-1.5"
        >
          <LockOpen size={14} aria-hidden="true" /> 잠금 해제
        </Button>
      )}
      {canDeleteUser && (
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={handleDeleteUser}
        disabled={locked || deleteBusy}
        aria-busy={deleteBusy || undefined}
        className="gap-1.5"
      >
        <Trash2 size={14} aria-hidden="true" />
        {/* 실제 동작은 계정 삭제다. '접근 차단'은 무엇을 하는지 오인시킨다. */}
        {deleteBusy ? '사용자 삭제 중…' : '사용자 삭제'}
      </Button>
      )}
    </>
  );
}
