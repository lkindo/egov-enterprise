import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import apiClientTestDouble, { resetApiClientTestDouble } from '@/test-utils/api-client-test-double';

vi.mock('@/lib/api/client', () => ({ default: apiClientTestDouble }));

/**
 * 첨부 다운로드가 **인증 경로로만** 나가는지 고정한다.
 *
 * 종전 구현은 `NEXT_PUBLIC_API_URL` 로 URL 을 만들어 `window.open` 했다. 그 경로는 axios
 * 인터셉터를 타지 않아 `Authorization` 이 붙지 않고, 절대 URL 설정에서는 same-origin
 * `proxy.ts` 의 쿠키→Bearer 주입까지 우회해 인증 다운로드가 401 이 된다. 상대 경로 설정에서
 * 우연히 동작하던 형태라 **배포 설정에 따라 조용히 깨졌다**.
 *
 * 그래서 상대·절대 두 설정 모두에서 같은 인증 경로를 쓰는지 검증한다.
 */
describe('FileService 인증 다운로드', () => {
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
  let openSpy: ReturnType<typeof vi.spyOn>;
  let createObjectUrl: ReturnType<typeof vi.fn>;
  let revokeObjectUrl: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    resetApiClientTestDouble();
    openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    createObjectUrl = vi.fn(() => 'blob:mock-url');
    revokeObjectUrl = vi.fn();
    // jsdom 에는 두 API 가 없다. 정의해 두고 호출 여부까지 단언한다.
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectUrl, configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectUrl, configurable: true });
  });

  afterEach(() => {
    openSpy.mockRestore();
    if (originalApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
  });

  async function loadService() {
    // `module` 이라는 이름은 쓰지 않는다 — Next.js 의 no-assign-module-variable 규칙이 에러로 잡는다.
    const loaded = await import('../FileService');
    return loaded.fileService;
  }

  for (const [label, apiUrl] of [
    ['상대 경로 설정', '/api/v1'],
    ['절대 URL 설정', 'https://api.example.gov/api/v1'],
  ] as const) {
    it(`${label}에서도 인증 axios 로 바이트를 받고 window.open 을 쓰지 않는다`, async () => {
      process.env.NEXT_PUBLIC_API_URL = apiUrl;
      const blob = new Blob(['bytes'], { type: 'application/octet-stream' });
      apiClientTestDouble.get.mockResolvedValue(blob);

      const fileService = await loadService();
      await fileService.downloadFile(11, 2, '보고서.pdf');

      // 인증 클라이언트를 거쳤는가 — 이것이 이 테스트의 계약이다.
      expect(apiClientTestDouble.get).toHaveBeenCalledTimes(1);
      const [requestedPath, config] = apiClientTestDouble.get.mock.calls[0] as [string, { responseType?: string }];
      expect(requestedPath).toContain('/11/2');
      expect(config?.responseType).toBe('blob');

      // 우회 경로가 되살아나면 즉시 red 가 된다.
      expect(openSpy).not.toHaveBeenCalled();
      expect(createObjectUrl).toHaveBeenCalledWith(blob);
      expect(revokeObjectUrl).toHaveBeenCalledTimes(0); // revoke 는 다음 매크로태스크로 미뤄진다
    });
  }

  it('atchFileSn 이 없으면 어떤 요청도 보내지 않는다', async () => {
    const fileService = await loadService();
    await fileService.downloadFile(0, 1);

    expect(apiClientTestDouble.get).not.toHaveBeenCalled();
    expect(createObjectUrl).not.toHaveBeenCalled();
  });

  it('다운로드 실패를 삼키지 않고 호출부로 전파한다', async () => {
    apiClientTestDouble.get.mockRejectedValue(new Error('401 Unauthorized'));

    const fileService = await loadService();
    await expect(fileService.downloadFile(11, 2, '보고서.pdf')).rejects.toThrow('401 Unauthorized');
    expect(openSpy).not.toHaveBeenCalled();
  });
});
