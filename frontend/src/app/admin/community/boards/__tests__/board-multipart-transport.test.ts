// @vitest-environment node
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { http, passthrough } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { server as mockServer } from '@/mocks/server';
import { createPostWithFilesOperation } from '@/types/generated-operations';

/*
 * 게시글 첨부 등록(createPostWithFiles)의 생성 multipart 전송 계약 — 게시판 소유(Phase 2 10단계 10c-1). JSON board part 와 반복 file
 * part 를 함께 싣는 유일한 서술자라, core 의 multipart 시험(lib/api/__tests__/generated-api-client.multipart)에서 옮겼다. 게시판이 빠진
 * 구성에서는 이 시험이 서술자와 함께 빠진다.
 */
const validBoard = {
  bbsId: 'BBS_001',
  pstTtl: '제목',
  pstCn: '내용',
};

describe('generated multipart Axios transport contract — board JSON part', () => {
  const originalBackendApiUrl = process.env.BACKEND_API_URL;

  afterEach(() => {
    if (originalBackendApiUrl === undefined) delete process.env.BACKEND_API_URL;
    else process.env.BACKEND_API_URL = originalBackendApiUrl;
    vi.resetModules();
  });

  it('generated descriptor가 BBS JSON/file part를 exact하게 소유한다', () => {
    expect(createPostWithFilesOperation.multipartParts).toEqual([
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
  });

  it.each([
    ['누락된 board part', { file: [new File(['x'], 'x.txt')] }],
    ['잘못된 board part 이름', { article: validBoard }],
    ['OpenAPI와 불일치하는 board JSON', {
      board: { bbsId: 'BBS_001', pstCn: '내용' },
    }],
    ['복수 file part의 단일값', {
      board: validBoard,
      file: new File(['x'], 'x.txt'),
    }],
  ])('%s는 transport 전에 fail-closed한다', async (_label, body) => {
    const { executeGeneratedMultipartOperation } = await import('@/lib/api/generated-api-client');

    await expect(executeGeneratedMultipartOperation(createPostWithFilesOperation, {
      path: { bbsId: 'BBS_001' },
      body,
    } as never)).rejects.toThrow(
      '생성 API multipart 요청이 OpenAPI part 계약과 일치하지 않습니다.',
    );
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
      mockServer.use(http.post(`http://127.0.0.1:${port}/api/v1/boards/BBS_001/posts/with-files`, () => passthrough()));
      vi.resetModules();
      const { executeGeneratedMultipartOperation } = await import('@/lib/api/generated-api-client');

      await expect(executeGeneratedMultipartOperation(createPostWithFilesOperation, {
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
});
