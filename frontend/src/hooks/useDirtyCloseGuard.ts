'use client';

import { useCallback, useEffect, useRef, type SyntheticEvent } from 'react';
import { useConfirm } from '@/app/components/ui/confirm-modal';

/**
 * 편집 컨테이너의 **미저장 이탈 보호**를 형태와 무관하게 제공한다.
 *
 * [왜 필요한가] 저장소는 라우터 전이에 대해서만 이 보호를 갖고 있었다
 * ([UnsavedChangesContext](../contexts/UnsavedChangesContext.tsx)). 그래서 같은 폼이라도
 * 전용 페이지에 있으면 '이동하면 저장하지 않은 변경이 사라집니다' 확인을 받고, 모달에 있으면
 * Esc·배경 클릭·X·취소 어느 경로로 닫아도 **경고 없이 입력이 사라졌다**. 실측 당시
 * `StandardModal` 소비자 중 dirty 가드를 등록한 곳이 0건이었다.
 *
 * [형태의 한계가 아니다] 보호가 모달에 없던 것은 구조 때문이 아니라 배선 누락이다 —
 * `UnsavedChangesContext` 의 `navigate(action)` 은 라우터를 쓰지 않아도 되는 임의 콜백이고,
 * 모달 위에 확인 모달을 겹치는 것도 이미 `DeptJobBoxManageDialog` 가 하고 있다. 그래서
 * 보호를 폼·모달마다 따로 구현하지 않고 이 훅 하나로 모은다.
 *
 * [저장 중은 이 훅의 책임이 아니다] 저장이 진행 중인 동안의 닫기 차단은 `StandardModal` 의
 * `closeDisabled` 가 이미 소유한다. 이 훅은 **dirty(입력했는데 저장하지 않음)** 만 본다.
 * 두 가드는 보완 관계이며 같은 모달에 함께 건다.
 *
 * 문구는 라우터 가드와 동일하게 맞춘다 — 같은 위험을 같은 말로 알려야 학습이 이전된다.
 *
 * @param dirty 폼이 사용자의 미저장 입력을 들고 있는가
 * @param onClose 실제로 닫는 동작(확인을 통과했을 때만 호출된다)
 * @returns 닫기 요청 핸들러. `onClose` 자리에 그대로 넣는다.
 */
const UNSAVED_CLOSE_CONFIRM = {
  title: '저장하지 않은 변경',
  message: '닫으면 저장하지 않은 변경이 사라집니다. 저장하려면 계속 편집을 선택하세요.',
  confirmText: '변경 버리고 닫기',
  cancelText: '계속 편집',
  variant: 'destructive',
} as const;

/** 이 훅이 돌려준 닫기 핸들러. 모달이 자기 보호를 한 번 더 걸어 확인이 두 번 뜨지 않게 가려낸다. */
const guardedCloseHandlers = new WeakSet<() => void>();

/** 그 닫기 핸들러가 이미 미저장 확인을 거치는가(useDirtyCloseGuard 가 만든 것인가). */
export function isGuardedClose(onClose: () => void): boolean {
  return guardedCloseHandlers.has(onClose);
}

export function useDirtyCloseGuard(dirty: boolean, onClose: () => void): () => void {
  const confirm = useConfirm();
  // 확인 모달이 떠 있는 동안 Esc 연타·배경 연타로 확인이 중첩되는 것을 막는다.
  const confirmingRef = useRef(false);

  const guarded = useCallback(() => {
    if (!dirty) {
      onClose();
      return;
    }
    if (confirmingRef.current) return;
    confirmingRef.current = true;
    void (async () => {
      try {
        const approved = await confirm(UNSAVED_CLOSE_CONFIRM);
        if (approved) onClose();
      } finally {
        confirmingRef.current = false;
      }
    })();
  }, [confirm, dirty, onClose]);

  useEffect(() => {
    guardedCloseHandlers.add(guarded);
  }, [guarded]);
  return guarded;
}

/**
 * 모달의 **사고성 닫기**(Esc·배경 클릭·X)를 화면이 아무 배선도 하지 않아도 보호한다(2026-10-01).
 *
 * `useDirtyCloseGuard` 는 화면이 dirty 를 계산해 넘겨야 한다. 그래서 그것을 쓰는 9곳 밖의 폼 모달 약 20곳은
 * Esc 한 번에 입력이 경고 없이 사라졌다(문자·알림 발송, 행사, 공통코드, 사용자 등록 등). 이 훅은 모달 안 폼에서
 * 입력이 일어났는지(input·change)만 보고, 닫기 요청이 오면 같은 문구로 확인한다.
 *
 * - 판정은 "연 뒤로 폼에 입력이 있었는가" 다. 값을 되돌려도 입력한 것으로 본다(놓치는 쪽이 아니라 묻는 쪽으로 기운다).
 * - 조회 조건 폼(`role="search"`)의 입력은 저장할 변경이 아니므로 세지 않는다.
 * - 저장에 성공한 화면이 스스로 닫는 것(isOpen=false)은 닫기 요청이 아니므로 확인하지 않는다.
 * - 화면이 '취소' 버튼에 같은 닫기 함수를 직접 부르는 경로는 이 훅을 지나지 않는다 — 그것은 명시적 폐기다.
 *   취소에도 확인을 걸려면 화면이 `useDirtyCloseGuard` 로 dirty 를 넘긴다.
 *
 * @returns `requestClose` 는 모달의 닫기 요청(onOpenChange(false))에, `trackInput` 은 모달 내용의
 *   onInputCapture·onChangeCapture 에 단다.
 */
export function useUnsavedCloseGuard({ isOpen, onClose, closeDisabled = false }: {
  isOpen: boolean;
  onClose: () => void;
  closeDisabled?: boolean;
}): { requestClose: () => void; trackInput: (event: SyntheticEvent) => void } {
  const confirm = useConfirm();
  const touchedRef = useRef(false);
  const confirmingRef = useRef(false);

  // 열 때마다 새로 센다 — 앞서 저장하고 닫은 입력이 다음 번 닫기에 남지 않게 한다.
  useEffect(() => {
    if (isOpen) touchedRef.current = false;
  }, [isOpen]);

  const trackInput = useCallback((event: SyntheticEvent) => {
    const target = event.target instanceof Element ? event.target : null;
    const form = target?.closest('form');
    if (!form || target?.closest('[role="search"]')) return;
    touchedRef.current = true;
  }, []);

  const requestClose = useCallback(() => {
    if (closeDisabled) return;
    // 화면이 이미 dirty 확인을 거는 닫기 함수면 그것에 맡긴다 — 확인을 두 번 묻지 않는다.
    if (!touchedRef.current || isGuardedClose(onClose)) {
      onClose();
      return;
    }
    if (confirmingRef.current) return;
    confirmingRef.current = true;
    void (async () => {
      try {
        const approved = await confirm(UNSAVED_CLOSE_CONFIRM);
        if (approved) onClose();
      } finally {
        confirmingRef.current = false;
      }
    })();
  }, [closeDisabled, confirm, onClose]);

  return { requestClose, trackInput };
}
