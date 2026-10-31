import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BoardPreview, type BoardPreviewFeatures } from '../BoardPreview';
import { CalendarTemplate, DefaultTemplate, FaqTemplate, GalleryTemplate, HubTemplate, QnaTemplate, WikiTemplate } from '../../../select-board-list/components/BoardTemplates';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { BoardPost } from '@/types/business/board';

/**
 * 미리보기는 신규 입력 설정과 기존 댓글·추천 누적 수를 구별한다.
 * 화면 유형은 만든 뒤 바꿀 수 없으므로 그 선택의 근거가 실제와 다른 그림이면 안 된다.
 */
const ALL_ON: BoardPreviewFeatures = {
  comments: true,
  recommendations: true,
  satisfaction: true,
  attachments: { allowed: true, maxFiles: 3, maxFileBytes: 5 * 1024 * 1024 },
  privatePostPolicy: 'OPTIONAL',
  reservation: true,
  pinning: true,
};
const ALL_OFF: BoardPreviewFeatures = {
  comments: false,
  recommendations: false,
  satisfaction: false,
  attachments: { allowed: false, maxFiles: 3, maxFileBytes: 0 },
  privatePostPolicy: 'NONE',
  reservation: false,
  pinning: false,
};
const LAYOUTS_WITH_POSTS = ['TMPLT_HUB', 'TMPLT_LIST', 'TMPLT_GALLERY', 'TMPLT_QNA', 'TMPLT_FAQ', 'TMPLT_WIKI'] as const;

const renderPreview = (tmpltId: string, features: BoardPreviewFeatures) =>
  render(<BoardPreview tmpltId={tmpltId} bbsTtl="사내 소식" bbsExpln="" features={features} />);

const COMPARISON_POST: BoardPost = {
  pstSn: 1, bbsId: 'preview-comparison', pstTtl: '비교 글', pstCn: '', useYn: 'Y', userId: 'example',
  userNm: '관리자', crtDt: '2024-05-20', commentCnt: 45, likeCnt: 12, inqCnt: 1240,
};
const actualProps = {
  list: [COMPARISON_POST], bbsId: COMPARISON_POST.bbsId, querySearchWrd: '',
  handleLike: () => {}, pendingLikePstSn: null, likesOpen: false,
};

describe('BoardPreview 는 고른 기능을 반영한다', () => {
  it('FAQ는 실제 렌더러와 같이 처음에는 모든 답이 접혀 있다', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const actual = render(<QueryClientProvider client={client}><FaqTemplate {...actualProps} /></QueryClientProvider>);
    expect(within(actual.container).getByRole('button', { name: /비교 글/ })).toHaveAttribute('aria-expanded', 'false');
    actual.unmount();
    client.clear();
    const preview = renderPreview('TMPLT_FAQ', ALL_ON);
    expect(preview.container.querySelectorAll('details')).toHaveLength(3);
    expect(preview.container.querySelectorAll('details[open]')).toHaveLength(0);
  });

  it('달력은 실제 렌더러와 같은 요일 순서·해당 월 날짜를 표시한다', () => {
    const actual = render(<CalendarTemplate {...actualProps} list={[]} currentViewDate={new Date(2024, 4, 1)} onPrevMonth={() => {}} onNextMonth={() => {}} />);
    const days = within(actual.container).getAllByText(/^\d{1,2}$/).map(day => day.textContent);
    const weekdays = within(actual.container).getAllByText(/^[일월화수목금토]$/).map(day => day.textContent);
    actual.unmount();
    const preview = renderPreview('TMPLT_CALENDAR', ALL_ON);
    expect(within(preview.container).getAllByText(/^\d{1,2}$/).map(day => day.textContent)).toEqual(days);
    expect(within(preview.container).getAllByText(/^[일월화수목금토]$/).map(day => day.textContent)).toEqual(weekdays);
  });

  it('달력은 행사 예시에도 비밀·예약·고정 설정을 반영하고 실제 이동 버튼은 만들지 않는다', () => {
    const { unmount } = renderPreview('TMPLT_CALENDAR', ALL_ON);
    for (const mark of ['비밀글', '예약', '고정']) expect(screen.getByText(mark)).toBeInTheDocument();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    unmount();
    renderPreview('TMPLT_CALENDAR', ALL_OFF);
    for (const mark of ['비밀글', '예약', '고정']) expect(screen.queryByText(mark)).not.toBeInTheDocument();
  });
  it.each([
    ['TMPLT_HUB', HubTemplate], ['TMPLT_LIST', DefaultTemplate], ['TMPLT_GALLERY', GalleryTemplate],
    ['TMPLT_QNA', QnaTemplate], ['TMPLT_WIKI', WikiTemplate],
  ] as const)('%s — 실제 렌더러와 댓글·추천·답변·조회 수의 표시 종류가 같다', (tmpltId, ActualLayout) => {
    const actual = render(<ActualLayout {...actualProps} />);
    const actualText = actual.container.textContent ?? '';
    actual.unmount();
    const preview = renderPreview(tmpltId, ALL_OFF);
    const previewText = within(preview.container).getByRole('region', { name: '게시판 레이아웃 미리보기' }).textContent ?? '';
    for (const count of [/댓글\s*\d/, /추천\s*\d/, /답변\s*\d/, /조회\s*[\d,]+/]) {
      expect(count.test(previewText), String(count)).toBe(count.test(actualText));
    }
  });

  it.each(LAYOUTS_WITH_POSTS)('%s — 실제 글 이동·추천 버튼을 연결하지 않는다', (tmpltId) => {
    const { container } = renderPreview(tmpltId, ALL_ON);
    expect(within(container).queryAllByRole('link')).toHaveLength(0);
    expect(within(container).queryAllByRole('button')).toHaveLength(0);
  });

  it('갤러리는 실제 목록에 없는 사진 영역을 만들지 않는다', () => {
    renderPreview('TMPLT_GALLERY', ALL_ON);
    expect(screen.queryAllByText('사진')).toHaveLength(0);
    expect(screen.getAllByText('갤러리')).toHaveLength(3);
  });

  it('표준 목록은 실제 표의 열을 사용하고 댓글 열을 만들지 않는다', () => {
    const actual = render(<DefaultTemplate {...actualProps} />);
    const columns = within(actual.container).getAllByRole('columnheader').map(cell => cell.textContent);
    actual.unmount();
    renderPreview('TMPLT_LIST', ALL_ON);
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('columnheader').map(cell => cell.textContent))
      .toEqual(columns);
    expect(within(table).queryByText(/댓글/)).not.toBeInTheDocument();
  });

  it('지식 허브는 대표 게시글을 표시하며 실제 목록에 없는 추천 수를 그리지 않는다', () => {
    renderPreview('TMPLT_HUB', ALL_ON);
    expect(screen.getByText('대표 게시글')).toBeInTheDocument();
    expect(screen.queryByText(/^추천 \d+$/)).not.toBeInTheDocument();
  });

  it('신규 댓글·추천을 꺼도 갤러리의 기존 누적 수는 표시한다', () => {
    renderPreview('TMPLT_GALLERY', ALL_OFF);
    expect(screen.getAllByText(/^댓글 \d+$/)).toHaveLength(3);
    expect(screen.getAllByText(/^추천 \d+$/)).toHaveLength(3);
  });

  it.each(LAYOUTS_WITH_POSTS)('%s — 고른 상태를 보이고 첨부 수는 실제처럼 갤러리에만 그린다', (tmpltId) => {
    renderPreview(tmpltId, ALL_ON);
    expect(screen.getAllByText('고정').length).toBeGreaterThan(0);
    expect(screen.getAllByText('예약').length).toBeGreaterThan(0);
    expect(screen.getAllByText('비밀글').length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/^첨부 \d+$/)).toHaveLength(tmpltId === 'TMPLT_GALLERY' ? 2 : 0);
    expect(screen.queryAllByText(/^댓글 \d+$/)).toHaveLength(['TMPLT_HUB', 'TMPLT_GALLERY'].includes(tmpltId) ? 3 : 0);
    expect(screen.queryAllByText(/^추천 \d+$/)).toHaveLength(['TMPLT_LIST', 'TMPLT_GALLERY', 'TMPLT_QNA'].includes(tmpltId) ? 3 : 0);
  });

  it.each(LAYOUTS_WITH_POSTS)('%s — 새 글 예시에 끈 상태·첨부 표지는 그리지 않는다', (tmpltId) => {
    renderPreview(tmpltId, ALL_OFF);
    for (const mark of ['고정', '예약', '비밀글', /^첨부 \d+$/]) {
      expect(screen.queryAllByText(mark), String(mark)).toHaveLength(0);
    }
  });

  it('글 보기·쓰기 화면에 덧붙는 것을 고른 기능만으로 보인다(첨부 수·크기 포함)', () => {
    const { unmount } = renderPreview('TMPLT_LIST', ALL_ON);
    expect(screen.getByText(/첨부 파일 — 3개까지 · 파일당 5MB/)).toBeInTheDocument();
    expect(screen.getByText('추천 단추')).toBeInTheDocument();
    expect(screen.getByText('만족도 평가')).toBeInTheDocument();
    expect(screen.getByText('댓글 쓰기')).toBeInTheDocument();
    expect(screen.getByText('비밀글로 쓰기(글쓴이가 고름)')).toBeInTheDocument();
    expect(screen.getByText('게시 시작일(오늘보다 뒤면 예약 글)')).toBeInTheDocument();
    unmount();

    renderPreview('TMPLT_LIST', ALL_OFF);
    expect(screen.getByText('새 첨부·추천·만족도 평가·댓글을 받지 않습니다. 기존 댓글과 누적 추천 수는 유지됩니다.')).toBeInTheDocument();
    expect(screen.queryByText('추천 단추')).toBeNull();
    expect(screen.queryByText('만족도 평가')).toBeNull();
    expect(screen.queryByText('댓글 쓰기')).toBeNull();
  });

  it('비밀글 필수면 모든 글을 비밀글로, 첨부 수 0·크기 0 은 개수 상한 없음·전역 상한으로 보인다', () => {
    renderPreview('TMPLT_LIST', { ...ALL_OFF, privatePostPolicy: 'REQUIRED', attachments: { allowed: true, maxFiles: 0, maxFileBytes: 0 } });
    expect(screen.getAllByText('비밀글')).toHaveLength(3);
    expect(screen.getByText('모든 글을 비밀글로 저장')).toBeInTheDocument();
    expect(screen.getByText(/첨부 파일 — 개수 상한 없음 · 파일당 10MB\(전역 상한\)/)).toBeInTheDocument();
  });

  it.each([...LAYOUTS_WITH_POSTS, 'TMPLT_CALENDAR'])('%s — 영문 자리표시·지어낸 주소를 쓰지 않는다', (tmpltId) => {
    const { container } = renderPreview(tmpltId, ALL_ON);
    const text = container.textContent ?? '';
    for (const placeholder of ['#Enterprise', 'PUBLIC_CONTENT', 'WRITE', 'FEATURED_KNOWLEDGE', 'TECH_SUPPORT', 'INSIGHT', 'Answers',
      'Solved', 'Last modified', 'PREVIEW_BOARD', 'EGOV.PRIME', 'MAINTENANCE_LOG', 'SUN']) {
      expect(text, placeholder).not.toContain(placeholder);
    }
    expect(text).toContain('/admin/community/boards/select-board-list?bbsId=(만들 때 정해짐)');
  });
});
