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
    const values = { ...initialValues } as Record<string, string>;
    searchParams.forEach((value, key) => {
      if (key in initialValues) {
        values[key] = value;
      }
    });
    return values as T;
  }, [searchParams, initialValues]);

  // 새로운 검색 조건으로 URL 업데이트. 호출 화면이 initialValues 로 선언한 키만 다시 조립한다.
  const setSearchValues = useCallback((newValues: Partial<T>) => {
    const params = new URLSearchParams();
    Object.keys(initialValues).forEach((key) => {
      const value = Object.prototype.hasOwnProperty.call(newValues, key)
        ? newValues[key]
        : searchParams.get(key);
      if (value) {
        params.set(key, value as string);
      }
    });
    // 페이지 번호가 포함되어 있다면 검색 시 1페이지(0)로 리세팅
    if (params.has('page') && !newValues.page) {
      params.set('page', '0');
    }
    // ADR-0009: 같은 화면의 검색·페이지 조건 변경은 history 사본을 늘리지 않는다.
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [router, pathname, searchParams, initialValues]);

  return {
    values: getSearchValues(),
    setSearchValues,
  };
}
