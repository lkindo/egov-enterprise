'use client';

import { useEffect, useCallback, useRef, useState } from 'react';

interface AutoSaveOptions {
  /** 임시저장 식별 키 (bbsId 등) */
  storageKey: string;
  /** 자동 저장 간격 (ms). 기본 3000(3초) — 주석이 "30초" 라고 적혀 있었으나 실제 기본값은 3000 이다. */
  interval?: number;
  /** 저장이 활성화되는 최소 글자 수, 기본 10자 */
  minLength?: number;
  /** 데이터 획득 함수 */
  getData: () => { title: string; content: string };
  /** 데이터 복원 콜백 */
  onRestore?: (data: { title: string; content: string }) => void;
}

interface DraftData {
  title: string;
  content: string;
  savedAt: string;
}

/**
 * 게시글 작성 자동 임시저장 훅
 */
export function useAutoSaveDraft(options: AutoSaveOptions) {
  const { storageKey, interval = 3000, minLength = 10, getData, onRestore } = options;
  const fullKey = `egov-draft-${storageKey}`;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState(false);

  // Use refs for callbacks to prevent infinite loops when inline functions are passed
  const onRestoreRef = useRef(onRestore);
  const getDataRef = useRef(getData);

  useEffect(() => {
    onRestoreRef.current = onRestore;
    getDataRef.current = getData;
  }, [onRestore, getData]);

  // 저장 실행
  const saveDraft = useCallback(() => {
    const { title, content } = getDataRef.current();

    // 최소 글자 수 미만이면 저장하지 않음
    if ((title + content).length < minLength) return;

    const draft: DraftData = {
      title,
      content,
      savedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(fullKey, JSON.stringify(draft));
      setLastSavedAt(draft.savedAt);
    } catch {
      // localStorage 용량 초과 등 예외 무시
    }
  }, [fullKey, minLength]);

  // 복원
  const restoreDraft = useCallback((): DraftData | null => {
    try {
      const raw = localStorage.getItem(fullKey);
      if (!raw) return null;
      const data = JSON.parse(raw) as DraftData;
      if (onRestoreRef.current) onRestoreRef.current({ title: data.title, content: data.content });
      return data;
    } catch {
      return null;
    }
  }, [fullKey]);

  // 삭제 (정상 제출 시 호출)
  const clearDraft = useCallback(() => {
    localStorage.removeItem(fullKey);
    setHasDraft(false);
    setLastSavedAt(null);
  }, [fullKey]);

  // 초기 진입 시 기존 임시저장 확인
  useEffect(() => {
    const existing = restoreDraft();
    if (existing) {
      setHasDraft(true);
      setLastSavedAt(existing.savedAt);
    }
  }, [restoreDraft]);

  // 주기적 자동 저장
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      saveDraft();
    }, interval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [saveDraft, interval]);

  // 페이지 이탈 시 저장
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveDraft();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveDraft]);

  return {
    /** 기존 임시저장 데이터 존재 여부 */
    hasDraft,
    /** 임시저장 데이터 복원 */
    restoreDraft,
    /** 임시저장 데이터 삭제 (정상 제출 시 호출) */
    clearDraft,
    /** 수동으로 즉시 저장 */
    saveDraft,
    /** 마지막 저장 시각 (ISO string) */
    lastSavedAt,
  };
}
