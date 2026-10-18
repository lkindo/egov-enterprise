'use client';

import { useRef, useState } from 'react';
import { failureMessage } from '@/lib/safe-error-log';
import { menuAdminService, type MenuStructure } from '@/services/foundation/system/MenuAdminService';
import type { MenuDraft } from './menuDraft';
import { QUIET } from './menuAdminModel';

/**
 * 시스템 메뉴 관리의 저장·다시 불러오기 상태와 다시 불러오기(2026-10-18 화면 분해 때 MenuAdminClient 에서 옮겼다 — 동작 변경
 * 없음). 저장(서버 쓰기)은 화면이 소유하고 이 상태를 쓴다 — 저장 중과 다시 불러오기 중에는 서로를, 그리고 초안 편집을 막는다.
 */
export function useMenuStructureReload({ adopt, selectedMenuNo, reloadGroups, announce }: {
  adopt: (structure: MenuStructure, keep: number | null) => void;
  selectedMenuNo: number | null;
  reloadGroups: () => void;
  announce: (text: string) => void;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const structureSavePendingRef = useRef(false);
  const [reloadPending, setReloadPending] = useState(false);
  const reloadPendingRef = useRef(false);
  /** 409 — 다른 곳에서 메뉴 구조나 그룹 권한이 바뀌었다. 초안은 지우지 않는다. */
  const [staleMessage, setStaleMessage] = useState<string | null>(null);
  /** 400 등 — 서버 문구 그대로. 거부된 초안을 함께 둔다 — 그 뒤 초안이 바뀌면 '마지막 저장 시도' 로 말한다. */
  const [saveError, setSaveError] = useState<{ message: string; draft: MenuDraft } | null>(null);
  const [reloadError, setReloadError] = useState<string | null>(null);

  /** 최신 메뉴 구조와 그룹 권한을 다시 읽는다. 지금 초안은 버린다(409 배너·DIP C5 배너·조회 실패의 다시 불러오기). */
  const reloadStructure = async () => {
    if (reloadPendingRef.current || structureSavePendingRef.current) return;
    reloadPendingRef.current = true;
    setReloadPending(true);
    setReloadError(null);
    try {
      const latest = await menuAdminService.getMenuStructure(QUIET);
      adopt(latest, selectedMenuNo);
      setStaleMessage(null);
      setSaveError(null);
      reloadGroups();
      announce('메뉴 구조를 다시 불러왔습니다.');
    } catch (error) {
      setReloadError(failureMessage(error, '메뉴 구조를 다시 불러오지 못했습니다. 잠시 뒤 다시 시도하세요.'));
    } finally {
      reloadPendingRef.current = false;
      setReloadPending(false);
    }
  };

  return {
    isSaving,
    setIsSaving,
    structureSavePendingRef,
    reloadPending,
    reloadPendingRef,
    staleMessage,
    setStaleMessage,
    saveError,
    setSaveError,
    reloadError,
    reloadStructure,
  };
}
