// @vitest-environment node
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { http, passthrough } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { server as mockServer } from '@/mocks/server';

describe('generated OpenAPI form/explode query transport', () => {
  const originalBackendApiUrl = process.env.BACKEND_API_URL;

  afterEach(() => {
    if (originalBackendApiUrl === undefined) delete process.env.BACKEND_API_URL;
    else process.env.BACKEND_API_URL = originalBackendApiUrl;
    vi.resetModules();
  });

  it('HPCM sort 배열은 반복 key로, scalar는 단일 key로 보내고 undefined는 생략해 안전하게 encode한다', async () => {
    let resolveUrl!: (url: string) => void;
    const receivedUrl = new Promise<string>((resolve) => {
      resolveUrl = resolve;
    });
    const server = createServer((request, response) => {
      resolveUrl(String(request.url));
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({
        success: true,
        code: 'S000',
        message: '성공',
        data: { list: [], total: 0, page: 0, size: 10, totalPage: 0 },
      }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    try {
      const { port } = server.address() as AddressInfo;
      const baseUrl = `http://127.0.0.1:${port}/api/v1`;
      process.env.BACKEND_API_URL = baseUrl;
      mockServer.use(http.get(`${baseUrl}/help/hpcm`, () => passthrough()));
      vi.resetModules();
      const { hpcmAdminService } = await import(
        '@/services/foundation/system/HpcmAdminService'
      );

      await expect(hpcmAdminService.getHpcmList({
        keyword: '한 글 &/?=',
        page: 0,
        size: undefined,
        sort: ['hlpSn,DESC', 'hlpDfn ASC'],
      })).resolves.toMatchObject({ list: [], page: 0 });

      expect(await receivedUrl).toBe(
        '/api/v1/help/hpcm?keyword=%ED%95%9C+%EA%B8%80+%26%2F%3F%3D&page=0'
        + '&sort=hlpSn%2CDESC&sort=hlpDfn+ASC',
      );
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (
        error ? reject(error) : resolve()
      )));
    }
  });
});
