import type { CSSProperties, ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StandardFileUploader } from '../standard-file-uploader';

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: toastMocks }));

vi.mock('framer-motion', async () => {
  const ReactModule = await vi.importActual<typeof import('react')>('react');

  type MotionProps = Record<string, unknown> & {
    children?: ReactNode;
    animate?: Record<string, unknown>;
    style?: CSSProperties;
  };

  const element = (tag: 'div' | 'label') => {
    function MockMotionElement({
      children,
      animate,
      initial: _initial,
      exit: _exit,
      transition: _transition,
      whileHover: _whileHover,
      whileTap: _whileTap,
      ...props
    }: MotionProps) {
      const width = animate?.width;
      const style = {
        ...(props.style as CSSProperties | undefined),
        ...(typeof width === 'string' ? { width } : {}),
      };

      return ReactModule.createElement(tag, { ...props, style }, children);
    }

    MockMotionElement.displayName = `MockMotion(${tag})`;
    return MockMotionElement;
  };

  return {
    motion: {
      div: element('div'),
      label: element('label'),
    },
    AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  };
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

function file(name: string, type: string, bytes = 4) {
  return new File([new Uint8Array(bytes)], name, { type });
}

function input() {
  return screen.getByLabelText('파일 첨부 선택') as HTMLInputElement;
}

function dropZone() {
  const zone = input().closest('label');
  expect(zone).not.toBeNull();
  return zone as HTMLLabelElement;
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('StandardFileUploader', () => {
  it('파일 입력 계약과 제한 안내를 노출하고 키보드 포커스를 제공한다', async () => {
    const user = userEvent.setup();
    render(
      <StandardFileUploader
        name="attachments"
        accept=".pdf,image/*"
        maxFiles={2}
        maxSizeMB={3}
        className="uploader-test"
      />,
    );

    expect(input()).toHaveAttribute('name', 'attachments');
    expect(input()).toHaveAttribute('accept', '.pdf,image/*');
    expect(input()).toHaveAttribute('multiple');
    expect(input()).not.toHaveClass('hidden');
    expect(screen.getByText('최대 2개 파일 / 3MB 제한')).toBeInTheDocument();
    expect(dropZone().parentElement).toHaveClass('uploader-test');

    await user.tab();
    expect(input()).toHaveFocus();
    expect(dropZone()).toHaveClass('focus-within:ring-2');
  });

  it('유효한 파일을 pending 목록에 추가하고 부모와 동기화한다', () => {
    const onFilesChange = vi.fn();
    const documentFile = file('guide.pdf', 'application/pdf');
    render(<StandardFileUploader accept=".pdf" onFilesChange={onFilesChange} />);

    fireEvent.change(input(), { target: { files: [documentFile] } });

    expect(screen.getByText('guide.pdf')).toBeInTheDocument();
    expect(screen.getByText('첨부 대기 중 (폼 제출 시 최종 업로드됨)')).toBeInTheDocument();
    expect(onFilesChange).toHaveBeenLastCalledWith([documentFile]);
    expect(toastMocks.success).toHaveBeenCalledWith('1개의 파일이 추가되었습니다.');
  });

  it.each([
    ['확장자', '.pdf', file('REPORT.PDF', '')],
    ['MIME 그룹', 'image/*', file('photo.bin', 'image/png')],
    ['정확한 MIME', 'application/pdf', file('download', 'application/pdf')],
  ])('%s accept 규칙에 맞는 드롭 파일을 허용한다', (_label, accept, acceptedFile) => {
    render(<StandardFileUploader accept={accept} />);

    fireEvent.drop(dropZone(), { dataTransfer: { files: [acceptedFile] } });

    expect(screen.getByText(acceptedFile.name)).toBeInTheDocument();
    expect(toastMocks.error).not.toHaveBeenCalled();
  });

  it('드래그 상태를 표시하고 허용되지 않은 형식은 차단한다', () => {
    render(<StandardFileUploader accept=".pdf" />);
    const executable = file('payload.exe', 'application/octet-stream');

    fireEvent.dragOver(dropZone());
    expect(screen.getByText('여기에 파일을 놓으세요')).toBeInTheDocument();

    fireEvent.drop(dropZone(), { dataTransfer: { files: [executable] } });

    expect(screen.getByText('클릭하거나 파일을 이곳에 드래그하세요')).toBeInTheDocument();
    expect(screen.queryByText('payload.exe')).not.toBeInTheDocument();
    expect(toastMocks.error).toHaveBeenCalledWith('payload.exe 형식은 첨부할 수 없습니다.');
  });

  it('용량 제한을 넘는 파일은 차단한다', () => {
    render(<StandardFileUploader maxSizeMB={1} />);
    const oversized = file('large.pdf', 'application/pdf', 1024 * 1024 + 1);

    fireEvent.change(input(), { target: { files: [oversized] } });

    expect(screen.queryByText('large.pdf')).not.toBeInTheDocument();
    expect(toastMocks.error).toHaveBeenCalledWith('large.pdf 크기가 1MB를 초과합니다.');
  });

  it('maxFiles의 남은 슬롯만 추가하고 초과 사실을 알린다', () => {
    const onFilesChange = vi.fn();
    const files = [
      file('one.txt', 'text/plain'),
      file('two.txt', 'text/plain'),
      file('three.txt', 'text/plain'),
    ];
    render(<StandardFileUploader maxFiles={2} onFilesChange={onFilesChange} />);

    fireEvent.change(input(), { target: { files } });

    expect(screen.getByText('one.txt')).toBeInTheDocument();
    expect(screen.getByText('two.txt')).toBeInTheDocument();
    expect(screen.queryByText('three.txt')).not.toBeInTheDocument();
    expect(onFilesChange).toHaveBeenLastCalledWith(files.slice(0, 2));
    expect(toastMocks.error).toHaveBeenCalledWith('최대 2개까지 첨부할 수 있습니다.');
  });

  it('삭제 버튼으로 파일과 부모 상태를 함께 제거한다', async () => {
    const onFilesChange = vi.fn();
    const documentFile = file('remove-me.pdf', 'application/pdf');
    render(<StandardFileUploader onFilesChange={onFilesChange} />);
    fireEvent.change(input(), { target: { files: [documentFile] } });

    const removeButton = screen.getByRole('button', { name: 'remove-me.pdf 첨부 파일 삭제' });
    expect(removeButton).toHaveClass('focus-visible:opacity-100');
    await userEvent.click(removeButton);

    expect(screen.queryByText('remove-me.pdf')).not.toBeInTheDocument();
    expect(onFilesChange).toHaveBeenLastCalledWith([]);
  });

  it('실제 자동 업로드의 진행률을 0~100으로 제한하고 완료 상태로 전환한다', async () => {
    const upload = deferred<void>();
    const onUpload = vi.fn((_file: File, onProgress: (progress: number) => void) => {
      onProgress(150);
      return upload.promise;
    });
    render(<StandardFileUploader isAutoUpload onUpload={onUpload} />);

    fireEvent.change(input(), { target: { files: [file('actual.pdf', 'application/pdf')] } });

    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(1));
    const progress = screen.getByRole('progressbar', { name: 'actual.pdf 업로드 진행률' });
    expect(progress).toHaveAttribute('aria-valuenow', '100');
    expect(progress.firstElementChild).toHaveStyle({ width: '100%' });

    upload.resolve();
    await waitFor(() => expect(screen.getByTestId('icon-checkcircle2')).toBeInTheDocument());
  });

  it('실제 자동 업로드 실패를 오류 상태와 toast로 알린다', async () => {
    const onUpload = vi.fn().mockRejectedValue(new Error('network down'));
    render(<StandardFileUploader isAutoUpload onUpload={onUpload} />);

    fireEvent.change(input(), { target: { files: [file('failed.pdf', 'application/pdf')] } });

    await waitFor(() => expect(screen.getByTestId('icon-alertcircle')).toBeInTheDocument());
    expect(toastMocks.error).toHaveBeenCalledWith('failed.pdf 업로드에 실패했습니다.');
  });

  it('업로더 함수 없는 자동 모드도 진행률을 표시하고 완료한다', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    render(<StandardFileUploader isAutoUpload />);

    fireEvent.change(input(), { target: { files: [file('fallback.pdf', 'application/pdf')] } });

    expect(screen.queryByText('첨부 대기 중 (폼 제출 시 최종 업로드됨)')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'fallback.pdf 업로드 진행률' })).toBeInTheDocument();
    expect(screen.getByTestId('icon-loader2')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2000));

    expect(screen.getByTestId('icon-checkcircle2')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('fallback 업로드 중 파일을 제거하면 interval을 즉시 정리한다', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const baselineTimers = vi.getTimerCount();
    render(<StandardFileUploader isAutoUpload />);
    fireEvent.change(input(), { target: { files: [file('cancel.pdf', 'application/pdf')] } });
    expect(vi.getTimerCount()).toBe(baselineTimers + 1);

    fireEvent.click(screen.getByRole('button', { name: 'cancel.pdf 첨부 파일 삭제' }));

    expect(vi.getTimerCount()).toBe(baselineTimers);
  });

  it('언마운트되면 실행 중인 fallback interval을 모두 정리한다', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const baselineTimers = vi.getTimerCount();
    const { unmount } = render(<StandardFileUploader isAutoUpload />);
    fireEvent.change(input(), { target: { files: [file('unmount.pdf', 'application/pdf')] } });
    expect(vi.getTimerCount()).toBe(baselineTimers + 1);

    unmount();

    expect(vi.getTimerCount()).toBe(baselineTimers);
  });
});
