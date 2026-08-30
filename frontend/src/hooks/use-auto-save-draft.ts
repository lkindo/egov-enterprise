'use client';

import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import {
  buildBoardDraftStorageKey,
  removeLegacyBoardDraftKeys,
  type BoardDraftScope,
} from '@/lib/drafts/board-draft-storage';

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

interface AutoSaveOptions {
  /** 사용자/세션·게시판·작업·레코드까지 포함한 초안 격리 범위. null이면 저장하지 않는다. */
  scope: BoardDraftScope | null;
  /** 자동 저장 간격 (ms). 기본 3000(3초) — 주석이 "30초" 라고 적혀 있었으나 실제 기본값은 3000 이다. */
  interval?: number;
  /** 저장이 활성화되는 최소 글자 수, 기본 10자 */
  minLength?: number;
  /** 초안 유효기간. 기본 24시간. */
  ttlMs?: number;
  /** 소유자를 판별할 수 없는 구 키. 값은 복원하지 않고 정확히 일치하는 키만 제거한다. */
  legacyKeys?: readonly string[];
  /** 데이터 획득 함수 */
  getData: () => { title: string; content: string };
  /** 데이터 복원 콜백 */
  onRestore?: (data: { title: string; content: string }) => void;
}

interface DraftData {
  version: 2;
  title: string;
  content: string;
  savedAt: string;
  expiresAt: number;
}

/**
 * 게시글 작성 자동 임시저장 훅
 */
export function useAutoSaveDraft(options: AutoSaveOptions) {
  const {
    scope,
    interval = 3000,
    minLength = 10,
    ttlMs = DEFAULT_TTL_MS,
    legacyKeys,
    getData,
    onRestore,
  } = options;
  const fullKey = useMemo(() => scope ? buildBoardDraftStorageKey(scope) : null, [scope]);
  const legacyKeySignature = (legacyKeys ?? []).join('\u0000');
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
    if (!fullKey || ttlMs <= 0) return;
    const { title, content } = getDataRef.current();

    // 최소 글자 수 미만이면 저장하지 않음
    if ((title + content).length < minLength) return;

    const draft: DraftData = {
      version: 2,
      title,
      content,
      savedAt: new Date().toISOString(),
      expiresAt: Date.now() + ttlMs,
    };

    try {
      localStorage.setItem(fullKey, JSON.stringify(draft));
      setLastSavedAt(draft.savedAt);
      setHasDraft(true);
    } catch {
      // localStorage 용량 초과 등 예외 무시
    }
  }, [fullKey, minLength, ttlMs]);

  const readDraft = useCallback((): DraftData | null => {
    if (!fullKey) return null;
    try {
      const raw = localStorage.getItem(fullKey);
      if (!raw) return null;
      const data = JSON.parse(raw) as Partial<DraftData>;
      const valid = data.version === 2
        && typeof data.title === 'string'
        && typeof data.content === 'string'
        && typeof data.savedAt === 'string'
        && typeof data.expiresAt === 'number'
        && Number.isFinite(data.expiresAt);
      if (!valid || data.expiresAt! <= Date.now()) {
        localStorage.removeItem(fullKey);
        return null;
      }
      return data as DraftData;
    } catch {
      try {
        localStorage.removeItem(fullKey);
      } catch {
        // 읽기뿐 아니라 삭제도 거부될 수 있다. 편집 화면은 계속 사용할 수 있어야 한다.
      }
      return null;
    }
  }, [fullKey]);

  // 복원
  const restoreDraft = useCallback((): DraftData | null => {
    const data = readDraft();
    if (data && onRestoreRef.current) {
      onRestoreRef.current({ title: data.title, content: data.content });
    }
    return data;
  }, [readDraft]);

  // 삭제 (정상 제출 시 호출)
  const clearDraft = useCallback(() => {
    if (fullKey) localStorage.removeItem(fullKey);
    setHasDraft(false);
    setLastSavedAt(null);
  }, [fullKey]);

  // 초기 진입 시 기존 임시저장 확인
  useEffect(() => {
    removeLegacyBoardDraftKeys(
      localStorage,
      legacyKeySignature ? legacyKeySignature.split('\u0000') : [],
    );
    const existing = readDraft();
    if (existing) {
      setHasDraft(true);
      setLastSavedAt(existing.savedAt);
    } else {
      setHasDraft(false);
      setLastSavedAt(null);
    }
  }, [legacyKeySignature, readDraft]);

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
