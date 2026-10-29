import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  scrapCreateFormSchema,
  scrapEditFormSchema,
} from '../scrap-form-validation';
import { ScrapFormDialog, type ScrapFormValues } from '../ScrapFormDialog';
import { submitPostScrap } from '@/queries/scrap-post-action';
import ScrapListClient from '../selectScrapList/ScrapListClient';

const mocks = vi.hoisted(() => ({
  back: vi.fn(),
  confirm: vi.fn(),
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
    getRaw: async (url: string, config?: unknown) => ({
      success: true,
      code: 'S000',
      message: '성공',
      data: await mocks.get(url.replace(/^\/api\/v1\//, ''), config),
    }),
    post: mocks.post,
    put: mocks.put,
    requestRaw: async (config: {
      data?: unknown;
      method?: string;
      url?: string;
    }) => {
      const url = (config.url ?? '').replace(/^\/api\/v1\//, '');
      let data: unknown;
      if (config.method === 'post') data = await mocks.post(url, config.data, undefined);
      else if (config.method === 'put') data = await mocks.put(url, config.data, undefined);
      else if (config.method === 'delete') data = await mocks.delete(url, undefined);
      else throw new Error(`지원하지 않는 테스트 HTTP method: ${config.method ?? ''}`);
      return { success: true, code: 'S000', message: '성공', data };
    },
  },
}));

vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('@/app/components/layout/DynamicBreadcrumb', () => ({
  DynamicBreadcrumb: () => <nav aria-label="현재 위치" />,
}));

vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ actions, children }: { actions: React.ReactNode; children: React.ReactNode }) => <main>{actions}{children}</main>,
}));
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ columns, data }: {
    columns: Array<{ accessor: (item: Record<string, unknown>, index: number) => React.ReactNode }>;
    data: Array<Record<string, unknown>>;
  }) => (
    <div>{data.map((item, rowIndex) => (
      <div key={rowIndex}>
        {columns.map((column, columnIndex) => <React.Fragment key={columnIndex}>{column.accessor(item, rowIndex)}</React.Fragment>)}
      </div>
    ))}</div>
  ),
}));

/*
  [2026-09-12 §A3-1] 등록·수정이 전용 페이지 2개에서 목록 위 모달 하나로 합쳐졌다.
  계약(검증 인라인 연결·서버 필드 오류 귀속·동기 잠금)은 그대로이고 그릇만 바뀐다.
*/
const onSaved = vi.fn();

function renderDetail(initialValues: ScrapFormValues = {
  scrapNm: '참고 자료', scrapUrl: 'https://example.com/reference', scrapExpln: '설명',
}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ScrapFormDialog
        isOpen
        mode="edit"
        scrapSn={17}
        initialValues={initialValues}
        onClose={() => {}}
        onSaved={onSaved}
      />
    </QueryClientProvider>,
  );
}

function renderInsert() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ScrapFormDialog isOpen mode="create" onClose={() => {}} onSaved={onSaved} />
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

  it.each([
    '/admin/community/boards/detail?bbsId=BBS-1&pstSn=31',
    '/cop/bbs/selectArticleDetail.do?bbsId=BBS-1&nttId=31',
    '/pages/guide?tab=1#top',
  ])('기존 내부 스크랩 %s는 편집에서 보존하고 신규 수동 등록에는 허용하지 않는다', (scrapUrl) => {
    const values = { scrapNm: '이름 수정', scrapUrl, scrapExpln: '설명 수정', useYn: 'Y' };
    const edited = scrapEditFormSchema.safeParse(values);

    expect(edited.success).toBe(true);
    if (edited.success) expect(edited.data.scrapUrl).toBe(scrapUrl);
    expect(scrapCreateFormSchema.safeParse(values).success).toBe(false);
  });

  it.each([
    ['경로 중간 역슬래시', '/admin\\community/boards/detail'],
    ['NUL 제어문자', '/admin/\u0000community/boards/detail'],
    ['DEL 제어문자', '/admin/\u007fcommunity/boards/detail'],
    ['앞쪽 개행', '\n/admin/community/boards/detail'],
    ['뒤쪽 탭', '/admin/community/boards/detail\t'],
    ['외부 주소의 역슬래시', 'https://example.com\\notice'],
    ['외부 주소의 개행', 'https://example.com/\nnotice'],
  ])('%s를 브라우저가 정규화하기 전에 편집과 목록 링크 모두에서 거부한다', async (_label, scrapUrl) => {
    const values = { scrapNm: '안전성 검사 스크랩', scrapUrl, scrapExpln: '보존 설명', useYn: 'Y' };
    expect.soft(scrapEditFormSchema.safeParse(values).success).toBe(false);
    mocks.get.mockResolvedValue({ list: [{ ...values, scrapSn: 17 }], total: 1, page: 1, size: 10, totalPage: 1 });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><ScrapListClient /></QueryClientProvider>);

    expect(await screen.findByRole('button', { name: '안전성 검사 스크랩' })).toBeVisible();
    expect(screen.getByText('보존 설명')).toBeVisible();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it.each([
    ['프로토콜 상대 주소', '//evil.example/path'],
    ['역슬래시 호스트', '/\\evil.example/path'],
    ['경로 중간 역슬래시', '/admin\\community/boards/detail'],
    ['탭', '/admin/\tcommunity/boards/detail'],
    ['개행', '/admin/\ncommunity/boards/detail'],
    ['NUL 제어문자', '/admin/\u0000community/boards/detail'],
    ['DEL 제어문자', '/admin/\u007fcommunity/boards/detail'],
    ['실행 스킴', 'javascript:alert(1)'],
  ])('등록·수정 모두 %s가 있는 URL을 거부한다', (_label, scrapUrl) => {
    const values = { scrapNm: '문서', scrapUrl, scrapExpln: '', useYn: 'Y' };
    expect(scrapCreateFormSchema.safeParse(values).success).toBe(false);
    expect(scrapEditFormSchema.safeParse(values).success).toBe(false);
  });

  it('게시글 스크랩 생산자가 저장한 내부 URL 그대로 이름·설명을 편집하면 수정 API를 한 번 호출한다', async () => {
    const canonicalPath = '/admin/community/boards/detail?bbsId=BBS-1&pstSn=31';
    await submitPostScrap({
      bbsId: 'BBS-1', pstSn: 31, title: '원본 게시글', boardTitle: '공지사항', canonicalPath,
      queryClient: new QueryClient(),
    });
    expect(mocks.post).toHaveBeenCalledTimes(1);
    const created = mocks.post.mock.calls[0][1] as ScrapFormValues;
    expect(created.scrapUrl).toBe(canonicalPath);
    renderDetail(created);
    const user = userEvent.setup();
    const name = screen.getByRole('textbox', { name: /스크랩명/ });
    const explanation = screen.getByRole('textbox', { name: '설명' });
    await user.clear(name);
    await user.type(name, '다시 찾을 게시글');
    await user.clear(explanation);
    await user.type(explanation, '업무에 참고할 내용');
    expect(screen.getByRole('textbox', { name: /참조 URL/ })).toHaveValue(canonicalPath);

    await user.click(screen.getByRole('button', { name: /수정 완료$/ }));

    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));
    expect(mocks.put).toHaveBeenCalledWith('scraps/17', {
      scrapNm: '다시 찾을 게시글', scrapUrl: canonicalPath, scrapExpln: '업무에 참고할 내용', useYn: 'Y',
    }, undefined);
    expect(mocks.post).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });

  it('신규 수동 등록은 내부 주소를 입력해도 저장하지 않고 URL 오류를 안내한다', async () => {
    renderInsert();
    fireEvent.change(screen.getByRole('textbox', { name: /스크랩명/ }), { target: { value: '수동 스크랩' } });
    const url = screen.getByRole('textbox', { name: /참조 URL/ });
    fireEvent.change(url, { target: { value: '/admin/community/boards/detail?bbsId=BBS-1&pstSn=31' } });

    fireEvent.click(screen.getByRole('button', { name: /스크랩 등록$/ }));

    expect(mocks.post).not.toHaveBeenCalled();
    expect(mocks.put).not.toHaveBeenCalled();
    expect(url).toHaveAttribute('aria-invalid', 'true');
    expect(await screen.findByRole('alert', { name: /입력 오류/ })).toBeVisible();
  });

  it('등록 URL 오류는 write 없이 인라인으로 연결하고 URL 입력으로 이동한다', async () => {
    const user = userEvent.setup();
    renderInsert();
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
    renderInsert();
    const name = screen.getByRole('textbox', { name: /스크랩명/ });
    const url = screen.getByRole('textbox', { name: /참조 URL/ });
    await user.type(name, '보존할 문서');
    await user.type(url, 'https://example.com/preserved');

    await user.click(screen.getByRole('button', { name: /스크랩 등록$/ }));

    expect(await screen.findByText('이미 등록된 URL입니다.')).toBeVisible();
    expect(name).toHaveValue('보존할 문서');
    expect(url).toHaveValue('https://example.com/preserved');
    expect(mocks.post).toHaveBeenCalledWith('scraps', expect.objectContaining({ useYn: 'Y' }), undefined);
    expect(url).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(url).toHaveFocus());
  });

  it('등록 pending 시작 전 동기 잠금으로 같은 submit을 한 번만 보낸다', async () => {
    let resolvePost!: () => void;
    mocks.post.mockReturnValueOnce(new Promise<number>((resolve) => {
      resolvePost = () => resolve(18);
    }));
    renderInsert();
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

    await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(1));
    expect(submit).toBeDisabled();
    resolvePost();
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
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

    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));
    expect(submit).toBeDisabled();
    resolvePut();
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  /*
    [2026-09-12 §A3-1] 삭제 계약은 여기서 사라지지 않고 **소유자가 옮겨 갔다** —
    `ScrapListClient.pending.test.tsx` 의 "confirm 전에 동기 선점하고 정확한 삭제 제어를 안내하며
    실패 뒤 목록을 유지한다" 가 같은 보장을 목록에서 검증한다. 삭제는 종전에도 목록이 갖고 있었고,
    수정 전용 페이지가 사라지면서 이 파일에는 대상이 남지 않는다.
  */
});
