import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppQueryClient } from '@/lib/query/list-query-defaults';

/**
 * 첨부 이미지 화면 캐시(2026-10-26 ADR-0042).
 *
 * 종전에는 마운트마다 목록 조회와 다운로드를 다시 해, 배너가 넘어갈 때·같은 이미지를 두 자리가 그릴 때마다
 * 받았고 그때마다 개인정보 접속기록이 쌓였다. 이제 첨부 번호별로 받은 바이트를 query 캐시에 두고, 그리는 자리마다
 * 그 바이트로 object URL 을 만들어 자리가 사라지면 회수한다. 실패·빈 첨부의 대체 표시는 종전 그대로다.
 */
const files = vi.hoisted(() => ({ getFileList: vi.fn(), fetchBlob: vi.fn() }));
vi.mock('@/services/foundation/file/FileService', () => ({ fileService: files }));

import { AttachmentImage, attachmentImageQueryKey } from '../attachment-image';

const originalCreate = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
const originalRevoke = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
let issued = 0;
const createUrl = vi.fn(() => `blob:image-${++issued}`);
const revokeUrl = vi.fn();

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const newClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const images = (container: HTMLElement) => Array.from(container.querySelectorAll('img'));

describe('AttachmentImage 화면 캐시', () => {
  beforeEach(() => {
    issued = 0;
    createUrl.mockClear();
    revokeUrl.mockClear();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createUrl });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeUrl });
    files.getFileList.mockReset();
    files.fetchBlob.mockReset();
    files.getFileList.mockImplementation(async (atchFileSn: number) => [{ atchFileSn, fileSn: 1 }]);
    files.fetchBlob.mockImplementation(async (atchFileSn: number) => new Blob([`image-${atchFileSn}`], { type: 'image/png' }));
  });

  afterEach(() => {
    if (originalCreate) Object.defineProperty(URL, 'createObjectURL', originalCreate);
    else delete (URL as { createObjectURL?: unknown }).createObjectURL;
    if (originalRevoke) Object.defineProperty(URL, 'revokeObjectURL', originalRevoke);
    else delete (URL as { revokeObjectURL?: unknown }).revokeObjectURL;
  });

  it('같은 이미지를 두 자리가 그려도 목록 조회와 다운로드는 한 번이고, 자리마다 자기 주소를 쓴다', async () => {
    const { container } = render(
      <>
        <AttachmentImage atchFileSn={101} alt="배너" />
        <AttachmentImage atchFileSn={101} alt="미리보기" />
      </>,
      { wrapper: wrapper(newClient()) },
    );

    await waitFor(() => expect(images(container)).toHaveLength(2));
    expect(files.getFileList).toHaveBeenCalledTimes(1);
    expect(files.fetchBlob).toHaveBeenCalledTimes(1);
    expect(files.fetchBlob).toHaveBeenCalledWith(101, 1, { suppressErrorToast: true });
    const sources = images(container).map((image) => image.getAttribute('src'));
    expect(new Set(sources).size).toBe(2);
    expect(screen.getByRole('img', { name: '배너' })).toHaveAttribute('src', expect.stringMatching(/^blob:image-/));
  });

  it('사라졌다 다시 그려도 다시 받지 않고, 사라진 자리의 주소는 회수한다', async () => {
    const client = newClient();
    const first = render(<AttachmentImage atchFileSn={101} alt="배너" />, { wrapper: wrapper(client) });
    await waitFor(() => expect(images(first.container)).toHaveLength(1));
    const firstUrl = images(first.container)[0].getAttribute('src');

    first.unmount();
    expect(revokeUrl).toHaveBeenCalledWith(firstUrl);

    const second = render(<AttachmentImage atchFileSn={101} alt="배너" />, { wrapper: wrapper(client) });
    expect(images(second.container)).toHaveLength(1);
    expect(images(second.container)[0].getAttribute('src')).not.toBe(firstUrl);
    expect(files.getFileList).toHaveBeenCalledTimes(1);
    expect(files.fetchBlob).toHaveBeenCalledTimes(1);
  });

  it('다른 첨부로 바뀌면 이전 주소를 회수하고, 앞서 받은 첨부로 돌아오면 다시 받지 않는다', async () => {
    const view = render(<AttachmentImage atchFileSn={101} alt="배너" />, { wrapper: wrapper(newClient()) });
    await waitFor(() => expect(images(view.container)).toHaveLength(1));
    const firstUrl = images(view.container)[0].getAttribute('src');

    view.rerender(<AttachmentImage atchFileSn={202} alt="배너" />);
    await waitFor(() => expect(files.fetchBlob).toHaveBeenCalledWith(202, 1, { suppressErrorToast: true }));
    await waitFor(() => expect(images(view.container)).toHaveLength(1));
    expect(revokeUrl).toHaveBeenCalledWith(firstUrl);

    view.rerender(<AttachmentImage atchFileSn={101} alt="배너" />);
    expect(images(view.container)).toHaveLength(1);
    expect(files.fetchBlob).toHaveBeenCalledTimes(2);
  });

  it('서버 오류(5xx)도 화면 전체를 오류로 바꾸지 않고 이 자리의 대체 표시로 끝나며 다시 보내지 않는다', async () => {
    files.getFileList.mockRejectedValue(Object.assign(new Error('Request failed with status code 500'), { response: { status: 500 } }));

    // 앱 전역 설정(5xx 최초 실패를 오류 경계로 올리고 한 번 재시도한다)을 그대로 쓴다.
    render(<AttachmentImage atchFileSn={101} alt="배너" />, { wrapper: wrapper(createAppQueryClient()) });

    expect(await screen.findByRole('img', { name: '배너 이미지를 표시할 수 없습니다' })).toBeInTheDocument();
    expect(files.getFileList).toHaveBeenCalledTimes(1);
    expect(files.fetchBlob).not.toHaveBeenCalled();
  });

  it('권한 없음(403)은 대체 표시로 끝난다', async () => {
    files.fetchBlob.mockRejectedValue(Object.assign(new Error('Request failed with status code 403'), { response: { status: 403 } }));

    render(<AttachmentImage atchFileSn={101} alt="배너" />, { wrapper: wrapper(newClient()) });

    expect(await screen.findByRole('img', { name: '배너 이미지를 표시할 수 없습니다' })).toBeInTheDocument();
    expect(createUrl).not.toHaveBeenCalled();
  });

  it('묶음에 파일이 없으면 내려받지 않고 대체 표시를 그린다', async () => {
    files.getFileList.mockResolvedValue([]);

    render(<AttachmentImage atchFileSn={101} alt="배너" />, { wrapper: wrapper(newClient()) });

    expect(await screen.findByRole('img', { name: '배너 이미지를 표시할 수 없습니다' })).toBeInTheDocument();
    expect(files.fetchBlob).not.toHaveBeenCalled();
  });

  it('첨부 번호가 없으면 조회하지 않는다', () => {
    render(<AttachmentImage atchFileSn={null} alt="배너" />, { wrapper: wrapper(newClient()) });

    expect(screen.getByRole('img', { name: '배너 이미지를 표시할 수 없습니다' })).toBeInTheDocument();
    expect(files.getFileList).not.toHaveBeenCalled();
  });

  it('캐시를 비우면(로그아웃·사용자 전환·권한 변경 때 AuthContext 가 비운다) 다음에 그릴 때 다시 받는다', async () => {
    const client = newClient();
    const first = render(<AttachmentImage atchFileSn={101} alt="배너" />, { wrapper: wrapper(client) });
    await waitFor(() => expect(images(first.container)).toHaveLength(1));
    first.unmount();
    expect(client.getQueryData(attachmentImageQueryKey(101))).toBeInstanceOf(Blob);

    act(() => { client.clear(); });

    const second = render(<AttachmentImage atchFileSn={101} alt="배너" />, { wrapper: wrapper(client) });
    await waitFor(() => expect(images(second.container)).toHaveLength(1));
    expect(files.fetchBlob).toHaveBeenCalledTimes(2);
  });
});
