import { vi, type Mock } from 'vitest';

/**
 * `@/lib/api/client`가 서비스 계층에 노출하는 HTTP 메서드 목록이다.
 *
 * 서비스 테스트는 axios 응답 전체가 아니라 client가 이미 추출한 `ApiResponse.data`를
 * 반환값으로 준비해야 한다. 이 테스트 더블을 공유하면 파일마다 메서드 모양을 다시
 * 선언하면서 생기는 누락과 서로 다른 reset 정책을 피할 수 있다.
 */
export const API_CLIENT_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

export type ApiClientMethodName = (typeof API_CLIENT_METHODS)[number];
export type ApiClientMethodMock = Mock<(...args: unknown[]) => Promise<unknown>>;
export type ApiClientDefaultResults = Partial<Record<ApiClientMethodName, unknown>>;

const createMethodMock = (): ApiClientMethodMock => {
  const method = vi.fn<(...args: unknown[]) => Promise<unknown>>();
  method.mockResolvedValue(undefined);
  return method;
};

export const apiClientTestDouble: Record<ApiClientMethodName, ApiClientMethodMock> = {
  get: createMethodMock(),
  post: createMethodMock(),
  put: createMethodMock(),
  patch: createMethodMock(),
  delete: createMethodMock(),
};

/**
 * 호출 이력과 구현을 함께 지운다. `vi.clearAllMocks()`와 달리 이전 테스트의 기본
 * resolve/reject 구현까지 제거하므로 테스트 순서에 따른 오염을 막는다.
 *
 * `defaultResults`는 각 메서드가 반환할, 이미 unwrap된 API data를 지정한다.
 */
export function resetApiClientTestDouble(defaultResults: ApiClientDefaultResults = {}): void {
  for (const methodName of API_CLIENT_METHODS) {
    const method = apiClientTestDouble[methodName];
    method.mockReset();
    method.mockResolvedValue(defaultResults[methodName]);
  }
}

export default apiClientTestDouble;
