'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

/**
 * 검색 조건을 URL 쿼리 파라미터와 동기화하는 훅
 */
export function useSearchState<T extends Record<string, string>>(initialValues: T) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 현재 URL에서 값을 읽어옴 (없으면 초기값)
  const getSearchValues = useCallback(() => {
    const values = { ...initialValues };
    searchParams.forEach((value, key) => {
      if (key in initialValues) {
        (values as any)[key] = value;
      }
    });
    return values;
  }, [searchParams, initialValues]);

  // 새로운 검색 조건으로 URL 업데이트
  const setSearchValues = useCallback((newValues: Partial<T>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newValues).forEach(([key, value]) => {
      if (value) {
        params.set(key, value as string);
      } else {
        params.delete(key);
      }
    });
    // 페이지 번호가 포함되어 있다면 검색 시 1페이지로 리셋하는 것이 일반적
    if (params.has('page') && !newValues.page) {
      params.set('page', '0');
    }
    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams]);

  return {
    values: getSearchValues(),
    setSearchValues,
  };
}