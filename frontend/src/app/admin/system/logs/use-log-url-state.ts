'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * 로그·감사 화면의 목록 상태를 URL 쿼리와 동기화하는 훅 모음.
 *
 * 공유·새로고침·뒤로가기에서 보던 화면이 복원되고, 사이드바 메뉴 활성 표시도 유지된다.
 * `router.replace(..., { scroll: false })` 를 쓰므로 히스토리를 오염시키지 않고
 * 페이지 이동 시 스크롤이 위로 튀지 않는다.
 *
 * ⚠ 검색어는 의도적으로 URL 에 반영하지 않는다.
 *   로그 검색어에는 사번·이름 등 개인정보가 실릴 수 있어 URL 노출은 제품 결정 보류 항목이다
 *   (감사 §6 D-13). 검색어는 각 화면의 로컬 상태로만 유지한다.
 */

/**
 * 1-base 페이지 번호를 `?page=` 와 동기화한다.
 * 1페이지는 파라미터를 제거해 기본 URL 을 깨끗하게 유지한다.
 */
export function usePageParam(paramName = 'page'): [number, (page: number) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const raw = Number(searchParams.get(paramName));
  const page = Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;

  const setPage = useCallback(
    (next: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!Number.isFinite(next) || next <= 1) params.delete(paramName);
      else params.set(paramName, String(Math.floor(next)));
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [paramName, pathname, router, searchParams],
  );

  return [page, setPage];
}

/**
 * 탭(카테고리) 선택 상태를 URL 쿼리와 동기화한다.
 * URL 값이 허용 목록에 없으면 `fallback` 으로 파생되므로 잘못된 링크에도 화면이 깨지지 않는다.
 *
 * @param allowed 허용 탭 목록(이 배열에 없는 값은 무시)
 * @param fallback 파라미터가 없거나 허용되지 않을 때의 기본 탭
 * @param options.paramName 쿼리 파라미터명(기본 `tab`)
 * @param options.resetParams 탭 전환 시 함께 제거할 파라미터(보통 `page`)
 */
export function useTabParam<T extends string>(
  allowed: readonly T[],
  fallback: T,
  options?: { paramName?: string; resetParams?: readonly string[] },
): [T, (tab: T) => void] {
  const paramName = options?.paramName ?? 'tab';
  const resetParams = options?.resetParams;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const raw = searchParams.get(paramName);
  // 허용 목록에서 직접 찾아 파생한다(캐스팅 없이 잘못된 쿼리 값을 fallback 으로 흡수).
  const activeTab: T = allowed.find((candidate) => candidate === raw) ?? fallback;

  const setTab = useCallback(
    (next: T) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === fallback) params.delete(paramName);
      else params.set(paramName, next);
      resetParams?.forEach((key) => params.delete(key));
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [fallback, paramName, pathname, resetParams, router, searchParams],
  );

  return [activeTab, setTab];
}
