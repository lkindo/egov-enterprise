import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ContentPage from '../[slug]/page';
import type { CmsDocument } from '@/lib/cms/document';

const mocks = vi.hoisted(() => ({
  getPublishedPage: vi.fn(),
  handOffContentPage: vi.fn(() => true),
  permissions: [] as string[],
  breadcrumb: vi.fn(),
}));

vi.mock('@/services/business/cms/CmsService', () => ({ cmsService: { getPublishedPage: mocks.getPublishedPage } }));
vi.mock('@/lib/cms/editor-handoff', () => ({ handOffContentPage: mocks.handOffContentPage }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { permissions: mocks.permissions, authorizationVersion: 'v1' } }),
}));
vi.mock('@/app/components/layout/DynamicBreadcrumb', () => ({
  DynamicBreadcrumb: (props: { customItems?: { name: string; href?: string }[]; currentLabel?: string }) => {
    mocks.breadcrumb(props);
    return <nav aria-label="현재 위치">{props.customItems?.map((item) => item.name).join(' › ')}</nav>;
  },
}));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NEXT_NOT_FOUND'); } }));

const document: CmsDocument = {
  schemaVersion: 1,
  sections: [{ id: 'a', label: '', layout: 'one', tone: 'default', spacing: 'normal', cells: [{
    kind: 'rich',
    doc: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '본문' }] }] },
  }] }],
};

const published = {
  contsPathNm: 'leave-guide', contsTtl: '휴가 신청 안내', contsExpln: '휴가 신청 절차', document,
  revisionNumber: 3, publishedAt: '2026-10-20T09:30:00',
};

async function renderPage(slug: string) {
  render(await ContentPage({ params: Promise.resolve({ slug }) }));
}

beforeEach(() => {
  mocks.getPublishedPage.mockReset();
  mocks.handOffContentPage.mockClear();
  mocks.breadcrumb.mockClear();
  mocks.permissions = [];
});

describe('게시된 콘텐츠 페이지 머리(ADR-0042)', () => {
  it('현재 위치(안내 페이지 › 제목)와 게시일·게시본 번호를 보인다', async () => {
    mocks.getPublishedPage.mockResolvedValue(published);
    await renderPage('leave-guide');
    expect(mocks.breadcrumb).toHaveBeenCalledWith(expect.objectContaining({
      customItems: [{ name: '안내 페이지', href: '/pages' }, { name: '휴가 신청 안내' }],
      currentLabel: '휴가 신청 안내',
    }));
    const article = screen.getByRole('article');
    expect(article).toContainElement(screen.getByRole('heading', { level: 1, name: '휴가 신청 안내' }));
    expect(screen.getByTestId('cms-page-revision')).toHaveTextContent('게시 2026-10-20 · v3');
    expect(screen.getByText('2026-10-20')).toHaveAttribute('datetime', '2026-10-20');
  });

  it('관리 화면을 열 권한(CMS_ADMIN_READ)이 없으면 이 페이지 편집을 보이지 않는다', async () => {
    mocks.getPublishedPage.mockResolvedValue(published);
    await renderPage('leave-guide');
    expect(screen.queryByRole('link', { name: '이 페이지 편집' })).toBeNull();
  });

  it('CMS_ADMIN_READ 가 있으면 이 페이지 편집이 그 페이지를 관리 화면에 넘긴다', async () => {
    mocks.permissions = ['CMS_ADMIN_READ'];
    mocks.getPublishedPage.mockResolvedValue(published);
    await renderPage('leave-guide');
    const edit = screen.getByRole('link', { name: '이 페이지 편집' });
    expect(edit).toHaveAttribute('href', '/admin/system/content-pages');
    fireEvent.click(edit);
    expect(mocks.handOffContentPage).toHaveBeenCalledWith('leave-guide');
  });

  it('조회 오류 화면도 안내 페이지 목록과 업무 홈으로 돌아갈 길을 준다', async () => {
    mocks.getPublishedPage.mockRejectedValue(Object.assign(new Error('boom'), { response: { status: 503 } }));
    await renderPage('leave-guide');
    expect(screen.getByRole('alert')).toHaveTextContent('페이지를 불러오지 못했습니다.');
    expect(screen.getByRole('link', { name: '안내 페이지 목록' })).toHaveAttribute('href', '/pages');
    expect(screen.getByRole('link', { name: '업무 홈으로' })).toHaveAttribute('href', '/');
  });

  it('없는(게시되지 않은) 페이지는 없음 화면으로 넘긴다', async () => {
    mocks.getPublishedPage.mockRejectedValue(Object.assign(new Error('missing'), { response: { status: 404 } }));
    await expect(renderPage('nope')).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
