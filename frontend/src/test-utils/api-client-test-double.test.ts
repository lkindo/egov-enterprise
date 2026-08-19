import { beforeEach, describe, expect, it } from 'vitest';
import {
  API_CLIENT_METHODS,
  apiClientTestDouble,
  resetApiClientTestDouble,
} from './api-client-test-double';

describe('apiClientTestDouble', () => {
  beforeEach(() => resetApiClientTestDouble());

  it('실제 client의 공개 HTTP 메서드 표면을 한 곳에서 제공한다', () => {
    expect(Object.keys(apiClientTestDouble)).toEqual(API_CLIENT_METHODS);
  });

  it('메서드별 기본값은 axios 응답 껍데기가 아닌 unwrap된 data로 반환된다', async () => {
    const page = { list: [{ id: 1 }], total: 1 };
    const created = { id: 2 };

    resetApiClientTestDouble({ get: page, post: created });

    await expect(apiClientTestDouble.get('/items')).resolves.toBe(page);
    await expect(apiClientTestDouble.post('/items', { name: 'new' })).resolves.toBe(created);
    await expect(apiClientTestDouble.put('/items/1', {})).resolves.toBeUndefined();
  });

  it('이전 테스트의 호출 이력과 실패 구현을 모두 제거한다', async () => {
    const failure = new Error('temporary failure');
    apiClientTestDouble.delete.mockRejectedValue(failure);

    await expect(apiClientTestDouble.delete('/items/1')).rejects.toBe(failure);
    expect(apiClientTestDouble.delete).toHaveBeenCalledTimes(1);

    resetApiClientTestDouble();

    expect(apiClientTestDouble.delete).not.toHaveBeenCalled();
    await expect(apiClientTestDouble.delete('/items/1')).resolves.toBeUndefined();
  });
});
