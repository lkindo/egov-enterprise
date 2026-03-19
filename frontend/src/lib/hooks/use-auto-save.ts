'use client';

import { useEffect, useState, useCallback } from 'react';

/**
 * 폼 데이터를 로컬 스토리지에 자동 저장하고 복구하는 훅
 */
export function useAutoSave<T>(key: string, data: T, onRestore: (savedData: T) => void) {
 const [lastSaved, setLastSaved] = useState<Date | null>(null);

 // 데이터 저장
 const save = useCallback(() => {
 if (!data || typeof window === 'undefined') return;
 localStorage.setItem(`autosave_${key}`, JSON.stringify(data));
 setLastSaved(new Date());
 }, [key, data]);

 // 주기적 자동 저장 (30초)
 useEffect(() => {
 const timer = setInterval(save, 30000);
 return () => clearInterval(timer);
 }, [save]);

 // 수동 복구 로직
 const restore = useCallback(() => {
 if (typeof window === 'undefined') return false;
 const saved = localStorage.getItem(`autosave_${key}`);
 if (saved) {
 try {
 onRestore(JSON.parse(saved));
 return true;
 } catch (e) {
 console.error('Failed to restore data', e);
 }
 }
 return false;
 }, [key, onRestore]);

 // 임시 데이터 삭제 (제출 성공 시 호출)
 const clear = useCallback(() => {
 if (typeof window === 'undefined') return;
 localStorage.removeItem(`autosave_${key}`);
 setLastSaved(null);
 }, [key]);

 const hasSavedData = typeof window !== 'undefined' ? !!localStorage.getItem(`autosave_${key}`) : false;

 return { lastSaved, save, restore, clear, hasSavedData };
}
