import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CmsHomeIntro } from '../CmsHomeIntro';
import type { CmsDocument } from '@/lib/cms/document';

const cms = vi.hoisted(() => ({ getHomeIntro: vi.fn() }));

vi.mock('@/services/business/cms/CmsService', () => ({ cmsService: cms }));
vi.mock('@/app/components/ui/attachment-image', () => ({ AttachmentImage: () => null }));

const document: CmsDocument = {
  schemaVersion: 1,
  sections: [{ id: 'a', label: '', layout: 'one', tone: 'default', spacing: 'normal', cells: [{
    kind: 'rich',
    doc: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '소개 본문' }] }] },
  }] }],
};

const page = { contsPathNm: 'welcome', contsTtl: '기관 업무 안내', document, revisionNumber: 2, publishedAt: '2026-10-20T09:00:00' };

/** 소개 본문 높이를 정한다 — jsdom 은 배치를 계산하지 않으므로 내용 상자의 scrollHeight 만 바꾼다(24rem = 384px). */
function contentHeight(px: number) {
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(function scrollHeight(this: HTMLElement) {
    return this.querySelector(':scope > [data-cms-section], :scope > div > [data-cms-section]') ? px : 0;
  });
}

function renderIntro() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><CmsHomeIntro /></QueryClientProvider>);
}

beforeEach(() => {
  cms.getHomeIntro.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CmsHomeIntro — 업무 홈 맨 위 소개(ADR-0042)', () => {
  it('게시본 제목을 제목(h2)으로 보이고 그 페이지 전체 보기로 잇는다', async () => {
    cms.getHomeIntro.mockResolvedValue(page);
    contentHeight(100);
    renderIntro();
    const section = await screen.findByRole('region', { name: '기관 업무 안내' });
    expect(screen.getByRole('heading', { level: 2, name: '기관 업무 안내' })).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /^기관 업무 안내\s*전체 보기$/ });
    expect(link).toHaveAttribute('href', '/pages/welcome');
    expect(section).toHaveTextContent('소개 본문');
  });

  it('높이 상한을 넘지 않으면 펼치기 단추도 흐림도 없다 — 아무 일도 하지 않는 단추를 두지 않는다', async () => {
    cms.getHomeIntro.mockResolvedValue(page);
    contentHeight(200);
    renderIntro();
    await screen.findByRole('region', { name: '기관 업무 안내' });
    expect(screen.queryByRole('button', { name: '펼치기' })).toBeNull();
  });

  it('넘치면 CSS 로만 자르고 펼치기·접기 단추가 같은 본문을 펼쳤다 접는다(aria-expanded)', async () => {
    cms.getHomeIntro.mockResolvedValue(page);
    contentHeight(1200);
    const { container } = renderIntro();
    const toggle = await screen.findByRole('button', { name: '펼치기' });
    const body = container.querySelector(`#${CSS.escape(toggle.getAttribute('aria-controls') ?? '')}`) as HTMLElement;
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(body).toHaveClass('max-h-96', 'overflow-hidden');
    const sections = container.querySelectorAll('[data-cms-section]');

    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: '접기' })).toHaveAttribute('aria-expanded', 'true');
    expect(body).not.toHaveClass('max-h-96');
    // 본문은 다시 그리지 않는다 — 같은 DOM 이다.
    expect(container.querySelectorAll('[data-cms-section]')[0]).toBe(sections[0]);

    fireEvent.click(screen.getByRole('button', { name: '접기' }));
    expect(screen.getByRole('button', { name: '펼치기' })).toHaveAttribute('aria-expanded', 'false');
    expect(body).toHaveClass('max-h-96');
  });

  it('접힌 채 키보드로 잘린 부분의 링크에 닿으면 펼친다 — 초점이 흐림 아래에 가려지지 않는다', async () => {
    const linked: CmsDocument = { ...document, sections: [{ ...document.sections[0], cells: [{
      kind: 'rich',
      doc: { type: 'doc', content: [{ type: 'paragraph', content: [
        { type: 'text', text: '아래쪽 링크', marks: [{ type: 'link', attrs: { href: '/pages/next' } }] },
      ] }] },
    }] }] };
    cms.getHomeIntro.mockResolvedValue({ ...page, document: linked });
    contentHeight(1200);
    renderIntro();
    expect(await screen.findByRole('button', { name: '펼치기' })).toHaveAttribute('aria-expanded', 'false');
    fireEvent.focusIn(screen.getByRole('link', { name: '아래쪽 링크' }));
    expect(screen.getByRole('button', { name: '접기' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('지정이 없으면 아무것도 그리지 않는다', async () => {
    cms.getHomeIntro.mockResolvedValue(null);
    const { container } = renderIntro();
    await waitFor(() => expect(cms.getHomeIntro).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('조회에 실패하면 무엇이 실패했는지와 업무 홈은 그대로임을 알리고 다시 시도할 수 있다', async () => {
    cms.getHomeIntro.mockRejectedValueOnce(new Error('503')).mockResolvedValueOnce(page);
    contentHeight(100);
    renderIntro();
    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('업무 홈 소개를 불러오지 못했습니다.');
    expect(status).toHaveTextContent('아래 업무 홈 내용은 그대로 쓸 수 있습니다.');
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByRole('heading', { level: 2, name: '기관 업무 안내' })).toBeInTheDocument();
  });
});
