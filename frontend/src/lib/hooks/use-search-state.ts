'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

/**
 * 寃님議곌굔님URL 荑쇰━ 파라미터? ?숆린?뷀븯님님 */
export function useSearchState<T extends Record<string, string>>(initialValues: T) {
 const router = useRouter();
 const pathname = usePathname();
 const searchParams = useSearchParams();

  // 현재 URL?먯꽌 媛믪쓣 ?쎌뼱님(?놁쑝硫?珥덇린媛?
  const getSearchValues = useCallback(() => {
    const values = { ...initialValues } as Record<string, string>;
    searchParams.forEach((value, key) => {
      if (key in initialValues) {
        values[key] = value;
      }
    });
    return values as T;
  }, [searchParams, initialValues]);

 // ?덈줈님寃님議곌굔?쇰줈 URL ?낅뜲?댄듃
 const setSearchValues = useCallback((newValues: Partial<T>) => {
 const params = new URLSearchParams(searchParams.toString());
 Object.entries(newValues).forEach(([key, value]) => {
 if (value) {
 params.set(key, value as string);
 } else {
 params.delete(key);
 }
 });
 // ?섏씠吏 踰덊샇媛 ?ы븿?섏뼱 ?덈떎硫?寃님님1?섏씠吏濡?由ъ뀑?섎뒗 寃껋씠 ?쇰컲님 if (params.has('page') && !newValues.page) {
 params.set('page', '0');
 }
 router.push(`${pathname}?${params.toString()}`);
 }, [router, pathname, searchParams]);

 return {
 values: getSearchValues(),
 setSearchValues,
 };
}
