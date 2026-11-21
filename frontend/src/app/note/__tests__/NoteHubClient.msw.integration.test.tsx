import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/mocks/server';

vi.mock('next/dynamic', () => ({
  default: () => function MockModal({ isOpen, title, footer, children }: React.PropsWithChildren<{ isOpen?: boolean; title?: string; footer?: React.ReactNode }>) {
    return isOpen ? <div role="dialog" aria-label={title}>{children}{footer}</div> : null;
  },
}));
vi.mock('@/app/components/layout/DynamicBreadcrumb', () => ({ DynamicBreadcrumb: () => null }));
vi.mock('@/app/components/ui/recipient-department-source', () => ({
  useRecipientDepartmentSource: () => ({ departments: [], loading: false }),
}));

import NoteHubClient from '../NoteHubClient';

function renderHub() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NoteHubClient />
    </QueryClientProvider>,
  );
}

describe('NoteHubClient MSW integration (real NoteService HTTP path)', () => {
  it('fetches received notes, switches to sent tab, views detail, and deletes through MSW', async () => {
    const received = [
      {
        noteSn: 11,
        noteSndngSn: 101,
        noteRcptnSn: 201,
        noteSj: '월간 점검 요청',
        noteCn: '서버 로그 점검 바랍니다.',
        trnsmiterNm: '김관리',
        crtDt: '2026-11-20T09:00:00',
        openYn: 'N',
      },
    ];
    let opened = false;
    let deletedRelationSn: string | null = null;

    server.use(
      http.get('*/api/v1/notes/received', () => HttpResponse.json({
        success: true,
        code: 'S000',
        message: '성공',
        data: {
          list: deletedRelationSn === '201'
            ? []
            : [{ ...received[0], openYn: opened ? 'Y' : 'N' }],
          total: deletedRelationSn === '201' ? 0 : 1,
          page: 1,
          size: 20,
          totalPage: deletedRelationSn === '201' ? 0 : 1,
        },
      })),
      http.get('*/api/v1/notes/received/unread-count', () => HttpResponse.json({
        success: true,
        code: 'S000',
        message: '성공',
        data: deletedRelationSn === '201' || opened ? 0 : 1,
      })),
      http.get('*/api/v1/notes/sent', () => HttpResponse.json({
        success: true,
        code: 'S000',
        message: '성공',
        data: {
          list: [
            {
              noteSn: 22,
              noteSndngSn: 302,
              noteSj: '보낸 안내',
              noteCn: '공지 확인 부탁드립니다.',
              crtDt: '2026-11-21T10:00:00',
              recipients: [{ noteRcptnSn: 401, rcverId: 'USER_LEE', rcverNm: '이담당', recptnSe: 'RECEIPT01', openYn: 'Y' }],
            },
          ],
          total: 1,
          page: 1,
          size: 20,
          totalPage: 1,
        },
      })),
      http.get('*/api/v1/notes/11', ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('type')).toBe('received');
        expect(url.searchParams.get('relationSn')).toBe('201');
        opened = true;
        return HttpResponse.json({
          success: true,
          code: 'S000',
          message: '성공',
          data: {
            noteSn: 11,
            noteRcptnSn: 201,
            noteSj: '월간 점검 요청',
            noteCn: '서버 로그 점검 바랍니다.',
            dsptchUserId: 'USR_ADMIN',
            trnsmiterNm: '김관리',
            crtDt: '2026-11-20T09:00:00',
            openYn: 'Y',
          },
        });
      }),
      http.delete('*/api/v1/notes/:relationSn', ({ params, request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('type')).toBe('received');
        deletedRelationSn = String(params.relationSn);
        return HttpResponse.json({ success: true, code: 'S000', message: '성공' });
      }),
    );

    renderHub();

    expect(await screen.findByText('월간 점검 요청')).toBeInTheDocument();
    expect(await screen.findByText('읽지 않음 1건')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /월간 점검 요청 쪽지 열기/ }));
    const dialog = await screen.findByRole('dialog', { name: '쪽지 데이터 상세 정보' });
    expect(await within(dialog).findByText('서버 로그 점검 바랍니다.')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: '닫기' }));
    await waitFor(() => expect(screen.queryByText('읽지 않음 1건')).toBeNull());

    fireEvent.click(screen.getByRole('tab', { name: /보낸 쪽지함/ }));
    expect(await screen.findByText('보낸 안내')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /받은 쪽지함/ }));
    expect(await screen.findByText('월간 점검 요청')).toBeInTheDocument();
    expect(await screen.findByText('읽음')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /월간 점검 요청 삭제/ }));
    await waitFor(() => expect(deletedRelationSn).toBe('201'));
    await waitFor(() => expect(screen.queryByText('월간 점검 요청')).toBeNull());
  });
});
