import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  scrapCreateFormSchema,
  scrapEditFormSchema,
} from '../scrap-form-validation';
import InsertScrapClient from '../insertScrap/InsertScrapClient';
import SelectScrapDetailClient from '../selectScrapDetail/[id]/SelectScrapDetailClient';

const mocks = vi.hoisted(() => ({
  back: vi.fn(),
  delete: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  push: vi.fn(),
  put: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: '17' }),
  useRouter: () => ({ back: mocks.back, push: mocks.push }),
}));

vi.mock('@/lib/api/client', () => ({
  default: {
    delete: mocks.delete,
    get: mocks.get,
    post: mocks.post,
    put: mocks.put,
  },
}));

vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('@/app/components/layout/DynamicBreadcrumb', () => ({
  DynamicBreadcrumb: () => <nav aria-label="현재 위치" />,
}));

function renderDetail() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SelectScrapDetailClient />
    </QueryClientProvider>,
  );
}

describe('scrap form validation contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.delete.mockResolvedValue(undefined);
    mocks.get.mockResolvedValue({
      scrapSn: 17,
      scrapNm: '참고 자료',
      scrapUrl: 'https://example.com/reference',
      scrapExpln: '설명',
      useYn: 'Y',
    });
    mocks.post.mockResolvedValue(18);
    mocks.put.mockResolvedValue(undefined);
  });

  it('generated ScrapDto의 문자열/Y-N 경계와 UI 필수·http(s) URL 형식을 보존한다', () => {
    const valid = {
      scrapNm: '가'.repeat(100),
      scrapUrl: `https://example.com/${'a'.repeat(980)}`,
      scrapExpln: '',
      useYn: 'Y',
    };

    expect(scrapCreateFormSchema.safeParse(valid).success).toBe(true);
    expect(scrapEditFormSchema.safeParse(valid).success).toBe(true);
    expect(scrapCreateFormSchema.safeParse({ ...valid, scrapNm: '' }).success).toBe(false);
    expect(scrapCreateFormSchema.safeParse({ ...valid, scrapNm: '가'.repeat(101) }).success).toBe(false);
    expect(scrapCreateFormSchema.safeParse({ ...valid, scrapUrl: 'ftp://example.com' }).success).toBe(false);
    expect(scrapCreateFormSchema.safeParse({ ...valid, scrapUrl: 'not-a-url' }).success).toBe(false);
    expect(scrapCreateFormSchema.safeParse({ ...valid, scrapUrl: `https://${'a'.repeat(1000)}.com` }).success).toBe(false);
    expect(scrapCreateFormSchema.safeParse({ ...valid, useYn: 'X' }).success).toBe(false);
  });

  it('등록 URL 오류는 write 없이 인라인으로 연결하고 URL 입력으로 이동한다', async () => {
    const user = userEvent.setup();
    render(<InsertScrapClient />);
    const name = screen.getByRole('textbox', { name: /스크랩명/ });
    const url = screen.getByRole('textbox', { name: /참조 URL/ });
    await user.type(name, '문서');
    await user.type(url, 'ftp://example.com');

    await user.click(screen.getByRole('button', { name: /스크랩 등록$/ }));

    expect(mocks.post).not.toHaveBeenCalled();
    expect(url).toHaveAttribute('aria-invalid', 'true');
    expect(await screen.findByRole('alert', { name: /입력 오류/ })).toHaveTextContent('http');
    await waitFor(() => expect(url).toHaveFocus());
  });

  it('등록 서버 필드 오류를 인라인으로 연결하고 입력값을 유지한다', async () => {
    mocks.post.mockRejectedValueOnce({
      response: { data: { errors: [{ field: 'scrapUrl', message: '이미 등록된 URL입니다.' }] } },
    });
    const user = userEvent.setup();
    render(<InsertScrapClient />);
    const name = screen.getByRole('textbox', { name: /스크랩명/ });
    const url = screen.getByRole('textbox', { name: /참조 URL/ });
    await user.type(name, '보존할 문서');
    await user.type(url, 'https://example.com/preserved');

    await user.click(screen.getByRole('button', { name: /스크랩 등록$/ }));

    expect(await screen.findByText('이미 등록된 URL입니다.')).toBeVisible();
    expect(name).toHaveValue('보존할 문서');
    expect(url).toHaveValue('https://example.com/preserved');
    expect(mocks.post).toHaveBeenCalledWith('/scraps', expect.objectContaining({ useYn: 'Y' }));
    expect(url).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(url).toHaveFocus());
  });

  it('등록 pending 시작 전 동기 잠금으로 같은 submit을 한 번만 보낸다', async () => {
    let resolvePost!: () => void;
    mocks.post.mockReturnValueOnce(new Promise<number>((resolve) => {
      resolvePost = () => resolve(18);
    }));
    render(<InsertScrapClient />);
    fireEvent.change(screen.getByRole('textbox', { name: /스크랩명/ }), {
      target: { value: '중복 방지 문서' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /참조 URL/ }), {
      target: { value: 'https://example.com/pending' },
    });
    const submit = screen.getByRole('button', { name: /스크랩 등록$/ });
    const form = submit.closest('form');
    expect(form).not.toBeNull();

    fireEvent.submit(form!);
    fireEvent.submit(form!);

    expect(mocks.post).toHaveBeenCalledTimes(1);
    expect(submit).toBeDisabled();
    resolvePost();
    await waitFor(() => expect(mocks.push).toHaveBeenCalled());
  });

  it('수정 URL 오류는 write 없이 인라인으로 연결하고 URL 입력으로 이동한다', async () => {
    const user = userEvent.setup();
    renderDetail();
    const url = await screen.findByDisplayValue('https://example.com/reference');
    await user.clear(url);
    await user.type(url, 'javascript:alert(1)');

    await user.click(screen.getByRole('button', { name: /수정 완료$/ }));

    expect(mocks.put).not.toHaveBeenCalled();
    expect(url).toHaveAttribute('aria-invalid', 'true');
    expect(await screen.findByRole('alert', { name: /입력 오류/ })).toHaveTextContent('http');
    await waitFor(() => expect(url).toHaveFocus());
  });

  it('수정 서버 필드 오류를 인라인으로 연결하고 편집값을 유지한다', async () => {
    mocks.put.mockRejectedValueOnce({
      response: { data: { errors: [{ field: 'scrapNm', message: '같은 스크랩명이 존재합니다.' }] } },
    });
    const user = userEvent.setup();
    renderDetail();
    const name = await screen.findByDisplayValue('참고 자료');
    const url = screen.getByDisplayValue('https://example.com/reference');
    await user.clear(name);
    await user.type(name, '보존할 수정 문서');

    await user.click(screen.getByRole('button', { name: /수정 완료$/ }));

    expect(await screen.findByText('같은 스크랩명이 존재합니다.')).toBeVisible();
    expect(name).toHaveValue('보존할 수정 문서');
    expect(url).toHaveValue('https://example.com/reference');
    expect(name).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(name).toHaveFocus());
  });

  it('수정 pending 시작 전 동기 잠금으로 같은 submit을 한 번만 보낸다', async () => {
    let resolvePut!: () => void;
    mocks.put.mockReturnValueOnce(new Promise<void>((resolve) => {
      resolvePut = resolve;
    }));
    renderDetail();
    await screen.findByDisplayValue('참고 자료');
    const submit = screen.getByRole('button', { name: /수정 완료$/ });
    const form = submit.closest('form');
    expect(form).not.toBeNull();

    fireEvent.submit(form!);
    fireEvent.submit(form!);

    expect(mocks.put).toHaveBeenCalledTimes(1);
    expect(submit).toBeDisabled();
    resolvePut();
    await waitFor(() => expect(mocks.push).toHaveBeenCalled());
  });

  it('삭제를 동기 잠금하고 pending 제어를 알리며 실패 시 편집값을 보존한다', async () => {
    let rejectDelete!: (reason?: unknown) => void;
    mocks.delete.mockReturnValueOnce(new Promise<void>((_, reject) => {
      rejectDelete = reject;
    }));
    renderDetail();
    const name = await screen.findByDisplayValue('참고 자료');
    fireEvent.change(name, { target: { value: '보존할 스크랩' } });
    const remove = screen.getByRole('button', { name: '보존할 스크랩 삭제' });

    act(() => {
      fireEvent.click(remove);
      fireEvent.click(remove);
    });

    await waitFor(() => expect(mocks.delete).toHaveBeenCalledTimes(1));
    expect(remove).toBeDisabled();
    expect(remove).toHaveAttribute('aria-busy', 'true');
    expect(remove).toHaveAccessibleName('보존할 스크랩 삭제 중');

    rejectDelete(new Error('스크랩 삭제 서버 오류'));

    await waitFor(() => {
      expect(mocks.toast).toHaveBeenCalledWith('스크랩 삭제 서버 오류', 'error');
    });
    expect(name).toHaveValue('보존할 스크랩');
    expect(remove).not.toBeDisabled();
    expect(remove).not.toHaveAttribute('aria-busy');
    expect(remove).toHaveAccessibleName('보존할 스크랩 삭제');
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
