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
 *   로그 검색어에는 사번·이름 등 개인정보가 실릴 수 있다. 검색어는 각 화면의 로컬 상태로만 유지한다.
 *
 * <p><b>[2026-09-04 owner 결정 — 보류 해제]</b> 종전 이 주석은 "제품 결정 보류 항목" 이라고 적었다.
 * PD-UX-002 의 Q1(사용자가 타이핑한 검색어를 URL 에 실을 것인가)이 owner 판단으로 종결됐다:
 * <b>현재 URL 에 실리는 검색어 14건은 전부 유지하고, 이 화면들이 주소창에 싣지 않는 현행도 유지한다.</b>
 * 즉 화면마다 판단이 다른 상태 그 자체가 승인된 결과다.
 *
 * <p><b>⚠ 이 비대칭을 "일관성 없음" 으로 읽고 한쪽에 맞추지 말 것.</b> 두 방향 다 승인된 결정을 되돌린다.
 * <ul>
 *   <li>이 화면들의 검색어를 URL 에 <b>넣는</b> 것 — 로그 검색은 사번·이름 조회가 일상이라 그 화면만
 *       주소창 노출을 피한다는 판단이다.</li>
 *   <li>'전체 결과 내보내기' 의 {@code searchKeyword} 를 <b>빼는</b> 것 — 그 값은 다운로드 내비게이션이지
 *       주소창 상태가 아니며(경계 = 주소창), 제거하려면 POST + Blob 전환과 binary GET 계약
 *       (DEC-OPS-016) 영향 확인이 선행이다. 유지가 승인된 상태다.</li>
 * </ul>
 *
 * <p>판단의 근거가 된 실측 하나를 함께 남긴다 — <b>화면 URL 은 이 저장소 DB 에 적재되지 않는다.</b>
 * {@code OperationalAuditInterceptor} 가 쓰는 {@code request.getRequestURI()} 는 서블릿 규격상
 * 쿼리스트링을 제외하고, 같은 메서드가 {@code /api/} 로 시작하지 않는 요청을 버린다.
 * 따라서 이 축의 잔존 위험은 "우리 DB" 가 아니라 <b>브라우저 히스토리·다운로드 관리자·공유 링크·
 * 저장소 밖 프록시 로그</b>다. 회귀 방어는 {@code scripts/log-search-url-boundary-contract.test.mjs}.
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
