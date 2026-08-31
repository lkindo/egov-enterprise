// @vitest-environment node
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { http, passthrough } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { server as mockServer } from '@/mocks/server';
import {
  createBbsPostOperation,
  uploadFilesOperation,
} from '@/types/generated-operations';

const validBoard = {
  bbsId: 'BBS_001',
  pstTtl: '제목',
  pstCn: '내용',
};

describe('generated multipart Axios transport contract', () => {
  const originalBackendApiUrl = process.env.BACKEND_API_URL;

  afterEach(() => {
    if (originalBackendApiUrl === undefined) delete process.env.BACKEND_API_URL;
    else process.env.BACKEND_API_URL = originalBackendApiUrl;
    vi.resetModules();
  });

  it('generated descriptor가 BBS JSON/file part와 files upload part를 exact하게 소유한다', () => {
    expect(createBbsPostOperation.multipartParts).toEqual([
      {
        name: 'board',
        required: true,
        multiple: false,
        mediaType: 'application/json',
        schemaRef: '#/components/schemas/BoardSaveRequest',
      },
      {
        name: 'file',
        required: false,
        multiple: true,
        mediaType: 'application/octet-stream',
        schemaRef: null,
      },
    ]);
    expect(uploadFilesOperation.multipartParts).toEqual([
      {
        name: 'files',
        required: true,
        multiple: true,
        mediaType: 'application/octet-stream',
        schemaRef: null,
      },
    ]);
  });

  it.each([
    ['누락된 board part', createBbsPostOperation, { file: [new File(['x'], 'x.txt')] }],
    ['잘못된 board part 이름', createBbsPostOperation, { article: validBoard }],
    ['OpenAPI와 불일치하는 board JSON', createBbsPostOperation, {
      board: { bbsId: 'BBS_001', pstCn: '내용' },
    }],
    ['잘못된 files part 이름', uploadFilesOperation, {
      file: [new File(['x'], 'x.txt')],
    }],
    ['필수 files part의 빈 복수값', uploadFilesOperation, { files: [] }],
    ['복수 files part의 단일값', uploadFilesOperation, {
      files: new File(['x'], 'x.txt'),
    }],
    ['files part의 binary가 아닌 값', uploadFilesOperation, { files: ['not-a-blob'] }],
    ['복수 file part의 단일값', createBbsPostOperation, {
      board: validBoard,
      file: new File(['x'], 'x.txt'),
    }],
  ])('%s는 transport 전에 fail-closed한다', async (_label, descriptor, body) => {
    const { executeGeneratedMultipartOperation } = await import('@/lib/api/generated-api-client');

    await expect(executeGeneratedMultipartOperation(descriptor as never, {
      path: descriptor === createBbsPostOperation ? { bbsId: 'BBS_001' } : undefined,
      body,
    } as never)).rejects.toThrow(
      '생성 API multipart 요청이 OpenAPI part 계약과 일치하지 않습니다.',
    );
  });

  it('사용자 config의 adapter 주입을 transport test seam으로 허용하지 않는다', async () => {
    const { executeGeneratedMultipartOperation } = await import('@/lib/api/generated-api-client');
    const adapter = vi.fn();

    await expect(executeGeneratedMultipartOperation(uploadFilesOperation, {
      body: { files: [new File(['hello'], 'hello.txt', { type: 'text/plain' })] },
      config: { adapter } as never,
    })).rejects.toThrow('생성 API 요청 설정이 operation 계약을 덮어쓸 수 없습니다.');

    expect(adapter).not.toHaveBeenCalled();
  });

  it('Node HTTP adapter가 JSON board와 반복 file part의 boundary·media type·원본 bytes를 생성한다', async () => {
    let resolveRequest!: (request: { contentType: string; body: string }) => void;
    const received = new Promise<{ contentType: string; body: string }>((resolve) => {
      resolveRequest = resolve;
    });
    const server = createServer((request, response) => {
      const chunks: Buffer[] = [];
      request.on('data', (chunk: Buffer) => chunks.push(chunk));
      request.on('end', () => {
        resolveRequest({
          contentType: String(request.headers['content-type'] ?? ''),
          body: Buffer.concat(chunks).toString('utf8'),
        });
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({
          success: true,
          code: 'S000',
          message: '성공',
          data: 101,
        }));
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    try {
      const { port } = server.address() as AddressInfo;
      process.env.BACKEND_API_URL = `http://127.0.0.1:${port}/api/v1`;
      mockServer.use(http.post(`http://127.0.0.1:${port}/api/v1/bbs/BBS_001`, () => passthrough()));
      vi.resetModules();
      const { executeGeneratedMultipartOperation } = await import('@/lib/api/generated-api-client');

      await expect(executeGeneratedMultipartOperation(createBbsPostOperation, {
        path: { bbsId: 'BBS_001' },
        body: {
          board: validBoard,
          file: [
            new File(['first-boundary'], 'first.txt', { type: 'text/plain' }),
            new File(['second-boundary'], 'second.txt', { type: 'text/plain' }),
          ],
        },
      })).resolves.toBe(101);

      const request = await received;
      expect(request.contentType).toMatch(/^multipart\/form-data; boundary=/);
      expect(request.body).toContain('name="board"');
      expect(request.body).toContain('Content-Type: application/json');
      expect(request.body).toContain(JSON.stringify(validBoard));
      expect(request.body.match(/name="file"/g)).toHaveLength(2);
      expect(request.body).toContain('filename="first.txt"');
      expect(request.body).toContain('first-boundary');
      expect(request.body).toContain('filename="second.txt"');
      expect(request.body).toContain('second-boundary');
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (
        error ? reject(error) : resolve()
      )));
    }
  });

  it('호출부가 multipart Content-Type을 수동 지정하면 transport 전에 거부한다', async () => {
    const { executeGeneratedMultipartOperation } = await import('@/lib/api/generated-api-client');
    await expect(executeGeneratedMultipartOperation(uploadFilesOperation, {
      body: { files: [new File(['x'], 'x.txt')] },
      config: { headers: { 'Content-Type': 'multipart/form-data' } },
    })).rejects.toThrow('생성 API 요청 설정이 operation 계약을 덮어쓸 수 없습니다.');
  });
});
