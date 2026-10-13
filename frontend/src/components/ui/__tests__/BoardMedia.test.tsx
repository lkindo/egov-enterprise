import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardMedia } from '../BoardMedia';
import type { BoardMediaReference } from '@/lib/attachments/board-media';

const files = vi.hoisted(() => ({ getFileList: vi.fn(), fetchBlob: vi.fn() }));
vi.mock('@/services/foundation/file/FileService', () => ({ fileService: files }));

const image: BoardMediaReference = { name: 'media-12345678-1234-4234-8234-123456789abc-photo.png', label: '회의 사진', kind: 'image' };
const video: BoardMediaReference = { name: 'media-12345678-1234-4234-8234-123456789abc-movie.mp4', label: '업무 안내 영상', kind: 'video' };
const attachment = { atchFileSn: 11, fileSn: 2, fileExtsn: 'png', orignlFileNm: image.name };
const originalCreate = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
const originalRevoke = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
const createUrl = vi.fn();
const revokeUrl = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  createUrl.mockReturnValue('blob:board-media');
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createUrl });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeUrl });
  files.getFileList.mockResolvedValue([attachment]);
  files.fetchBlob.mockResolvedValue(new Blob(['bytes'], { type: 'application/octet-stream' }));
});
afterEach(cleanup);
afterAll(() => {
  if (originalCreate) Object.defineProperty(URL, 'createObjectURL', originalCreate);
  else Reflect.deleteProperty(URL, 'createObjectURL');
  if (originalRevoke) Object.defineProperty(URL, 'revokeObjectURL', originalRevoke);
  else Reflect.deleteProperty(URL, 'revokeObjectURL');
});

describe('BoardMedia 인증 미디어 표시', () => {
  it('아직 저장하지 않은 파일은 네트워크 없이 표시하고 unmount 때 URL을 해제한다', async () => {
    const view = render(<BoardMedia reference={image} pendingFiles={[new File(['bytes'], image.name)]} />);
    expect(await screen.findByRole('img', { name: image.label })).toHaveAttribute('src', 'blob:board-media');
    expect(files.getFileList).not.toHaveBeenCalled();
    expect(files.fetchBlob).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: '파일 내려받기' })).toHaveAttribute('download', image.label);
    view.unmount();
    expect(revokeUrl).toHaveBeenCalledWith('blob:board-media');
  });

  it('현재 글의 첨부 묶음과 정확히 맞는 파일만 인증 경로로 불러온다', async () => {
    render(<BoardMedia reference={image} atchFileSn={11} />);
    await screen.findByRole('img', { name: image.label });
    expect(files.getFileList).toHaveBeenCalledWith(11, expect.objectContaining({ signal: expect.any(AbortSignal), suppressErrorToast: true }));
    expect(files.fetchBlob).toHaveBeenCalledWith(11, 2, expect.objectContaining({ signal: expect.any(AbortSignal), suppressErrorToast: true }));
    expect((createUrl.mock.calls[0][0] as Blob).type).toBe('image/png');
  });

  it('영상은 사용자가 불러오기를 누른 뒤 내려받고 재생 컨트롤을 제공한다', async () => {
    const user = userEvent.setup();
    const view = render(<BoardMedia reference={video} atchFileSn={11} attachments={[{ ...attachment, fileExtsn: 'mp4', orignlFileNm: video.name }]} />);
    expect(files.fetchBlob).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '영상 불러오기' }));
    await waitFor(() => expect(view.container.querySelector('video')).toHaveAttribute('src', 'blob:board-media'));
    expect(view.container.querySelector('video')).toHaveAttribute('controls');
    expect(view.container.querySelector('video')).not.toHaveAttribute('autoplay');
    expect(files.getFileList).not.toHaveBeenCalled();
  });

  it.each([
    ['다른 묶음', [{ ...attachment, atchFileSn: 12 }]],
    ['확장자 불일치', [{ ...attachment, fileExtsn: 'html' }]],
    ['중복 이름', [attachment, { ...attachment, fileSn: 3 }]],
    ['없는 파일', []],
  ])('%s는 바이트 조회 전에 거부한다', async (_label, attachments) => {
    render(<BoardMedia reference={image} atchFileSn={11} attachments={attachments} />);
    expect(await screen.findByText(`${image.label} 파일을 표시할 수 없습니다.`)).toBeInTheDocument();
    expect(files.fetchBlob).not.toHaveBeenCalled();
    expect(createUrl).not.toHaveBeenCalled();
  });

  it('조회 실패 뒤 재시도할 수 있고 디코딩 실패에도 파일 다운로드를 보존한다', async () => {
    const user = userEvent.setup();
    files.fetchBlob.mockRejectedValueOnce(new Error('403'));
    render(<BoardMedia reference={image} atchFileSn={11} attachments={[attachment]} />);
    await user.click(await screen.findByRole('button', { name: '다시 시도' }));
    const displayed = await screen.findByRole('img', { name: image.label });
    fireEvent.error(displayed);
    expect(screen.getByText(`${image.label} 파일을 표시할 수 없습니다.`)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '파일 내려받기' })).toHaveAttribute('href', 'blob:board-media');
  });

  it('늦게 도착한 응답은 unmount 뒤 URL을 만들지 않고 요청을 취소한다', async () => {
    let resolve: (blob: Blob) => void = () => {};
    files.fetchBlob.mockReturnValue(new Promise<Blob>(done => { resolve = done; }));
    const view = render(<BoardMedia reference={image} atchFileSn={11} attachments={[attachment]} />);
    await waitFor(() => expect(files.fetchBlob).toHaveBeenCalled());
    const config = files.fetchBlob.mock.calls[0][2] as { signal: AbortSignal };
    view.unmount();
    expect(config.signal.aborted).toBe(true);
    await act(async () => { resolve(new Blob(['late'])); });
    expect(createUrl).not.toHaveBeenCalled();
  });

  it('참조 객체가 다시 만들어져도 같은 파일을 재조회하거나 URL을 해제하지 않는다', async () => {
    const view = render(<BoardMedia reference={image} atchFileSn={11} attachments={[attachment]} />);
    await screen.findByRole('img', { name: image.label });
    view.rerender(<BoardMedia reference={{ ...image }} atchFileSn={11} attachments={[{ ...attachment }]} />);
    expect(files.fetchBlob).toHaveBeenCalledTimes(1);
    expect(revokeUrl).not.toHaveBeenCalled();
  });

  it('기존 순번 0 첨부와 비운 설명을 보존하고 안전한 대체 이름을 쓴다', async () => {
    render(<BoardMedia reference={{ ...image, label: '' }} atchFileSn={11} attachments={[{ ...attachment, fileSn: 0 }]} />);
    expect(await screen.findByRole('img', { name: '첨부 이미지' })).toBeInTheDocument();
    expect(files.fetchBlob).toHaveBeenCalledWith(11, 0, expect.any(Object));
    expect(screen.getByRole('link', { name: '파일 내려받기' })).toHaveAttribute('download', image.name);
  });

  it('첨부 목록에서 파일이 사라지면 기존 blob을 즉시 숨기고 해제한다', async () => {
    const view = render(<BoardMedia reference={image} atchFileSn={11} attachments={[attachment]} />);
    await screen.findByRole('img', { name: image.label });
    view.rerender(<BoardMedia reference={image} atchFileSn={11} attachments={[]} />);
    expect(screen.queryByRole('img', { name: image.label })).not.toBeInTheDocument();
    expect(revokeUrl).toHaveBeenCalledWith('blob:board-media');
    expect(files.fetchBlob).toHaveBeenCalledTimes(1);
  });
});
