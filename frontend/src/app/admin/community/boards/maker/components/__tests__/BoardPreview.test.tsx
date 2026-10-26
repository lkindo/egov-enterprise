import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BoardPreview, type BoardPreviewFeatures } from '../BoardPreview';

/**
 * [2026-10-26 ADR-0043 WIZ-09] 미리보기는 고른 기능을 그린다 — 끈 기능의 표지(댓글 수·추천·첨부·비밀글·예약·고정)는 그리지 않는다.
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

describe('BoardPreview 는 고른 기능을 반영한다', () => {
  it.each(LAYOUTS_WITH_POSTS)('%s — 모두 켜면 고정·예약·비밀글·첨부 표지와 댓글·추천 수를 그린다', (tmpltId) => {
    renderPreview(tmpltId, ALL_ON);
    expect(screen.getAllByText('고정').length).toBeGreaterThan(0);
    expect(screen.getAllByText('예약').length).toBeGreaterThan(0);
    expect(screen.getAllByText('비밀글').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^첨부 \d+$/).length).toBeGreaterThan(0);
    if (tmpltId !== 'TMPLT_FAQ' && tmpltId !== 'TMPLT_WIKI') {
      expect(screen.getAllByText(/^댓글 \d+$/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/^추천 \d+$/).length).toBeGreaterThan(0);
    }
  });

  it.each(LAYOUTS_WITH_POSTS)('%s — 끈 기능의 표지는 그리지 않는다', (tmpltId) => {
    renderPreview(tmpltId, ALL_OFF);
    for (const mark of ['고정', '예약', '비밀글', /^첨부 \d+$/, /^댓글 \d+$/, /^추천 \d+$/]) {
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
    expect(screen.getByText('첨부·추천·만족도 평가·댓글을 받지 않아 글 아래에 덧붙는 것이 없습니다.')).toBeInTheDocument();
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
