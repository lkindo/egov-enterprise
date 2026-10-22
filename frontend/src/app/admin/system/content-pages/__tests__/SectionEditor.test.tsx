import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionEditor } from '../SectionEditor';
import type { CmsSection } from '@/lib/cms/document';

const mocks = vi.hoisted(() => ({ uploadFiles: vi.fn() }));
vi.mock('@/services/foundation/file/FileService', () => ({ fileService: { uploadFiles: mocks.uploadFiles } }));
vi.mock('@/app/components/ui/attachment-image', () => ({
  AttachmentImage: ({ atchFileSn }: { atchFileSn: number }) => <span data-testid="attachment" data-sn={atchFileSn} />,
}));
vi.mock('@/components/cms/CmsRichTextEditor', () => ({ CmsRichTextEditor: () => <div data-testid="rich-editor" /> }));

const imageSection = (atchFileSn = 0): CmsSection => ({
  id: 's1',
  label: '안내',
  layout: 'one',
  tone: 'default',
  spacing: 'normal',
  cells: [{ kind: 'image', atchFileSn, alt: '', decorative: false, caption: '' }],
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => { resolve = onResolve; reject = onReject; });
  return { promise, resolve, reject };
}

function renderSection(onChange = vi.fn(), onNotice = vi.fn(), canUpload = true) {
  render(
    <SectionEditor section={imageSection()} index={0} total={1} readOnly={false} canUpload={canUpload}
      onChange={onChange} onLayoutChange={vi.fn()} onMove={vi.fn()} onRemove={vi.fn()} onNotice={onNotice} />,
  );
  return { onChange, onNotice };
}

const imageFile = () => new File(['png'], 'guide.png', { type: 'image/png' });

beforeEach(() => vi.clearAllMocks());

describe('SectionEditor — ImageCellEditor 이미지 올리기', () => {
  it('올리는 동안 단추를 잠가 uploadFiles 를 한 번만 부르고, 실패하면 칸 안에 알린다', async () => {
    const { onChange, onNotice } = renderSection();
    const pendingUpload = deferred<number>();
    mocks.uploadFiles.mockImplementation(() => pendingUpload.promise);
    const fileInput = screen.getByLabelText('안내 1단 이미지 파일');
    const uploadButton = screen.getByRole('button', { name: '이미지 올리기' });

    fireEvent.change(fileInput, { target: { files: [imageFile()] } });
    fireEvent.click(uploadButton);
    await waitFor(() => expect(uploadButton).toBeDisabled());
    expect(uploadButton).toHaveAttribute('aria-busy', 'true');
    fireEvent.change(fileInput, { target: { files: [imageFile()] } });
    expect(mocks.uploadFiles).toHaveBeenCalledTimes(1);

    pendingUpload.reject(new Error('too large'));
    expect(await screen.findByRole('alert')).toHaveTextContent('이미지를 올리지 못했습니다');
    expect(onNotice).toHaveBeenCalledWith('이미지를 올리지 못했습니다. 파일 형식과 크기를 확인해 주세요.');
    expect(onChange).not.toHaveBeenCalled();
    expect(uploadButton).toBeEnabled();
  });

  it('파일 올리기 권한이 없으면 올리기 단추를 두지 않고 이유를 말한다', () => {
    renderSection(vi.fn(), vi.fn(), false);
    expect(screen.queryByRole('button', { name: '이미지 올리기' })).toBeNull();
    expect(screen.queryByLabelText('안내 1단 이미지 파일')).toBeNull();
    expect(screen.getByText('이미지를 올리려면 파일 올리기 권한이 필요합니다.')).toBeInTheDocument();
  });

  it('올린 파일 번호를 칸에 넣는다', async () => {
    const { onChange } = renderSection();
    mocks.uploadFiles.mockResolvedValue(41);
    fireEvent.change(screen.getByLabelText('안내 1단 이미지 파일'), { target: { files: [imageFile()] } });

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      cells: [expect.objectContaining({ kind: 'image', atchFileSn: 41 })],
    })));
  });
});
