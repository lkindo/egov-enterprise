import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  getRaw: vi.fn(),
  requestRaw: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

describe('FileService 인증 다운로드', () => {
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
  let openSpy: ReturnType<typeof vi.spyOn>;
  let createObjectUrl: ReturnType<typeof vi.fn>;
  let revokeObjectUrl: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    createObjectUrl = vi.fn(() => 'blob:mock-url');
    revokeObjectUrl = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectUrl, configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectUrl, configurable: true });
  });

  afterEach(() => {
    openSpy.mockRestore();
    if (originalApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
  });

  async function loadService() {
    const loaded = await import('../FileService');
    return loaded.fileService;
  }

  for (const [label, apiUrl] of [
    ['상대 경로 설정', '/api/v1'],
    ['절대 URL 설정', 'https://api.example.gov/api/v1'],
  ] as const) {
    it(`${label}에서도 generated binary 경계로 바이트를 받고 window.open을 쓰지 않는다`, async () => {
      process.env.NEXT_PUBLIC_API_URL = apiUrl;
      const blob = new Blob(['bytes'], { type: 'application/octet-stream' });
      client.getRaw.mockResolvedValue(blob);

      const fileService = await loadService();
      await fileService.downloadFile(11, 2, '보고서.pdf');

      expect(client.getRaw).toHaveBeenCalledWith('files/11/2', { responseType: 'blob' });
      expect(openSpy).not.toHaveBeenCalled();
      expect(createObjectUrl).toHaveBeenCalledWith(blob);
      expect(revokeObjectUrl).not.toHaveBeenCalled();
    });
  }

  it('atchFileSn이 없으면 어떤 요청도 보내지 않는다', async () => {
    const fileService = await loadService();
    await fileService.downloadFile(0, 1);

    expect(client.getRaw).not.toHaveBeenCalled();
    expect(createObjectUrl).not.toHaveBeenCalled();
  });

  it('다운로드 실패를 삼키지 않고 호출부로 전파한다', async () => {
    client.getRaw.mockRejectedValue(new Error('401 Unauthorized'));

    const fileService = await loadService();
    await expect(fileService.downloadFile(11, 2, '보고서.pdf')).rejects.toThrow('401 Unauthorized');
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('Blob이 아닌 binary 응답은 object URL 생성 전에 거부한다', async () => {
    client.getRaw.mockResolvedValue('not-binary');

    const fileService = await loadService();
    await expect(fileService.downloadFile(11, 2)).rejects.toThrow(
      '생성 API binary 응답이 Blob 계약과 일치하지 않습니다.',
    );
    expect(createObjectUrl).not.toHaveBeenCalled();
  });
});
