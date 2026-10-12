// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

import { uploadFilesOperation } from '@/types/generated-operations';

/*
 * 생성 multipart 전송 계약 — core 업무(파일 업로드)로 본다. JSON part 를 함께 싣는 게시글 첨부 등록(createPostWithFiles)의 사례는
 * 게시판 소유 시험(app/admin/community/boards/__tests__/board-multipart-transport)으로 옮겼다(Phase 2 10단계 10c-1) — 생성물은 생성 계약을
 * 구성으로 줄이므로(10c) 그 서술자를 import 하면 게시판이 빠진 구성에서 사라진 이름을 쓴다. JSON part 경로의 유일한 소비자가 게시판이라
 * 게시판이 빠진 구성에는 그 경로를 쓰는 화면도 없다.
 */
describe('generated multipart Axios transport contract', () => {
  const originalBackendApiUrl = process.env.BACKEND_API_URL;

  afterEach(() => {
    if (originalBackendApiUrl === undefined) delete process.env.BACKEND_API_URL;
    else process.env.BACKEND_API_URL = originalBackendApiUrl;
    vi.resetModules();
  });

  it('generated descriptor가 files upload part를 exact하게 소유한다', () => {
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
    ['잘못된 files part 이름', uploadFilesOperation, {
      file: [new File(['x'], 'x.txt')],
    }],
    ['필수 files part의 빈 복수값', uploadFilesOperation, { files: [] }],
    ['복수 files part의 단일값', uploadFilesOperation, {
      files: new File(['x'], 'x.txt'),
    }],
    ['files part의 binary가 아닌 값', uploadFilesOperation, { files: ['not-a-blob'] }],
  ])('%s는 transport 전에 fail-closed한다', async (_label, descriptor, body) => {
    const { executeGeneratedMultipartOperation } = await import('@/lib/api/generated-api-client');

    await expect(executeGeneratedMultipartOperation(descriptor as never, { body } as never)).rejects.toThrow(
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

  it('호출부가 multipart Content-Type을 수동 지정하면 transport 전에 거부한다', async () => {
    const { executeGeneratedMultipartOperation } = await import('@/lib/api/generated-api-client');
    await expect(executeGeneratedMultipartOperation(uploadFilesOperation, {
      body: { files: [new File(['x'], 'x.txt')] },
      config: { headers: { 'Content-Type': 'multipart/form-data' } },
    })).rejects.toThrow('생성 API 요청 설정이 operation 계약을 덮어쓸 수 없습니다.');
  });
});
