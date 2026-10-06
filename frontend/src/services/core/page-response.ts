import type { PageResponse } from '@/types/foundation/system';

/** 생성 페이지 응답 DTO(`PageResponse*Dto`)의 공통 모양. 서버는 다섯 필드를 모두 보내지만 생성 타입에서는 선택이다. */
export interface GeneratedPage<T> {
  list?: T[];
  total?: number;
  page?: number;
  size?: number;
  totalPage?: number;
}

/**
 * 생성 페이지 응답이 화면의 페이지 계약(list 배열, total·page·size·totalPage 숫자)을 갖췄는지 검사하고
 * **같은 객체**를 그 계약 타입으로 돌려준다. 어기면 `<label> 페이지 응답이 필수 계약과 일치하지 않습니다.` 를
 * 던진다 — 계약을 어긴 응답을 빈 목록으로 흘려보내지 않는다.
 *
 * <p>원소 타입은 화면이 다루는 타입을 명시 타입 인자로 넘기거나(`requirePageResponse<AuditLog>(response, …)`),
 * 넘기기 전에 응답을 그 타입으로 캐스팅한다. 응답 모양 census(DEC-OPS-146)는 생성 응답이 넘어가는 매개변수
 * 타입·캐스트 대상을 생성 응답과 비교하므로, 원소 타입을 추론에 맡기면 서버가 보내지 않는 필드를 선언해도
 * 잡지 못한다. 이 함수의 반환값을 다시 캐스팅하는 것도 같은 이유로 비교 대상이 아니다.
 */
export function requirePageResponse<T>(response: GeneratedPage<T>, label: string): PageResponse<T> {
  if (
    !Array.isArray(response.list)
    || typeof response.total !== 'number'
    || typeof response.page !== 'number'
    || typeof response.size !== 'number'
    || typeof response.totalPage !== 'number'
  ) {
    throw new Error(`${label} 페이지 응답이 필수 계약과 일치하지 않습니다.`);
  }
  return response as PageResponse<T>;
}

/**
 * {@link requirePageResponse} 와 같이 검사한 뒤 다섯 필드만 담은 **새** 페이지를 만든다. `mapItem` 을 주면
 * 원소마다 적용한다 — 원소 검사·변환은 페이지 검사가 통과한 뒤에 돈다.
 */
export function copyPageResponse<T>(response: GeneratedPage<T>, label: string): PageResponse<T>;
export function copyPageResponse<T, R>(
  response: GeneratedPage<T>,
  label: string,
  mapItem: (item: T) => R,
): PageResponse<R>;
export function copyPageResponse<T, R>(
  response: GeneratedPage<T>,
  label: string,
  mapItem?: (item: T) => R,
): PageResponse<T | R> {
  const page = requirePageResponse(response, label);
  return {
    list: mapItem ? page.list.map(mapItem) : page.list,
    total: page.total,
    page: page.page,
    size: page.size,
    totalPage: page.totalPage,
  };
}
