'use client';

import { useEffect, useState, useCallback } from 'react';

/**
 * 님?곗씠?곕? 濡쒖뺄 ㅽ넗由ъ님님먮룞 ν븯怨蹂듦뎄?섎뒗 님 */
export function useAutoSave<T>(key: string, data: T, onRestore: (savedData: T) => void) {
 const [lastSaved, setLastSaved] = useState<Date | null>(null);

 // 데이터님 const save = useCallback(() => {
 if (!data || typeof window === 'undefined') return;
 localStorage.setItem(`autosave_${key}`, JSON.stringify(data));
 setLastSaved(new Date());
 }, [key, data]);

 // 二쇨린님?먮룞 님(30珥
 useEffect(() => {
 const timer = setInterval(save, 30000);
 return () => clearInterval(timer);
 }, [save]);

 // ?섎룞 蹂듦뎄 濡쒖쭅
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

 // ?꾩떆 데이터님젣 (?쒖텧 ?깃났 님?몄텧)
 const clear = useCallback(() => {
 if (typeof window === 'undefined') return;
 localStorage.removeItem(`autosave_${key}`);
 setLastSaved(null);
 }, [key]);

 const hasSavedData = typeof window !== 'undefined' ? !!localStorage.getItem(`autosave_${key}`) : false;

 return { lastSaved, save, restore, clear, hasSavedData };
}
