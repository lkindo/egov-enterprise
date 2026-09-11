'use client';

import { useCallback, useRef } from 'react';
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
export function useDirtyCloseGuard(dirty: boolean, onClose: () => void): () => void {
  const confirm = useConfirm();
  // 확인 모달이 떠 있는 동안 Esc 연타·배경 연타로 확인이 중첩되는 것을 막는다.
  const confirmingRef = useRef(false);

  return useCallback(() => {
    if (!dirty) {
      onClose();
      return;
    }
    if (confirmingRef.current) return;
    confirmingRef.current = true;
    void (async () => {
      try {
        const approved = await confirm({
          title: '저장하지 않은 변경',
          message: '닫으면 저장하지 않은 변경이 사라집니다. 저장하려면 계속 편집을 선택하세요.',
          confirmText: '변경 버리고 닫기',
          cancelText: '계속 편집',
          variant: 'destructive',
        });
        if (approved) onClose();
      } finally {
        confirmingRef.current = false;
      }
    })();
  }, [confirm, dirty, onClose]);
}
