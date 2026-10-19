'use client';

import { EmptyStateDisplay, ErrorStateDisplay } from '@/app/components/ui/status-displays';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import type { HelpGuide } from '@/services/business/user/help/HelpUserService';

export type GuideTab = 'guide' | 'manual';

/**
 * 도움말 센터의 읽기 전용 두 탭 문구(2026-10-19). 관리 화면이 등록한 도움말(HPCM)·온라인 매뉴얼을 로그인한 사용자 누구나 읽는다.
 * 비어 있으면 '아직 등록된 … 이 없다' 는 사실만 말한다 — 조회 실패·조회 중을 빈 상태로 말하지 않는다(DEC-OPS-100).
 */
export const GUIDE_TAB_COPY: Record<GuideTab, {
  label: string;
  listLabel: string;
  loading: string;
  loadError: string;
  empty: string;
}> = {
  guide: {
    label: '도움말',
    listLabel: '도움말 목록',
    loading: '도움말을 불러오는 중…',
    loadError: '도움말을 불러오지 못했습니다.',
    empty: '아직 등록된 도움말이 없습니다.',
  },
  manual: {
    label: '온라인 매뉴얼',
    listLabel: '온라인 매뉴얼 목록',
    loading: '온라인 매뉴얼을 불러오는 중…',
    loadError: '온라인 매뉴얼을 불러오지 못했습니다.',
    empty: '아직 등록된 온라인 매뉴얼이 없습니다.',
  },
};

interface HelpGuideListProps {
  tab: GuideTab;
  guides: HelpGuide[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  searchKeyword: string;
}

/** 안내 목록. 제목과 설명을 그대로 보인다(설명은 관리자가 입력한 줄바꿈을 지킨다). 순서는 서버가 정한다. */
export function HelpGuideList({ tab, guides, loading, error, onRetry, searchKeyword }: HelpGuideListProps) {
  const copy = GUIDE_TAB_COPY[tab];
  if (error) {
    return <ErrorStateDisplay error={error} onRetry={onRetry} className="bg-card border-2 border-dashed border-border" />;
  }
  if (loading) {
    return <p role="status" className="py-12 text-center text-sm text-muted-foreground">{copy.loading}</p>;
  }
  if (guides.length === 0) {
    return (
      <EmptyStateDisplay
        message={emptyResultMessage(searchKeyword, copy.empty)}
        className="bg-card border-2 border-dashed border-border"
      />
    );
  }
  return (
    <ul aria-label={copy.listLabel} className="space-y-4">
      {guides.map((guide) => (
        <li key={guide.id}>
          <article
            aria-labelledby={`${tab}-title-${guide.id}`}
            className="space-y-3 rounded-lg border-2 border-border/40 bg-card p-6"
          >
            <h3 id={`${tab}-title-${guide.id}`} className="text-lg font-bold text-foreground">
              {guide.title}
            </h3>
            <p className="whitespace-pre-line text-[length:var(--font-size-body)] leading-relaxed text-foreground/80">
              {guide.description || '등록된 설명이 없습니다.'}
            </p>
            {guide.resourcePath && (
              <p className="text-xs text-muted-foreground">
                리소스 경로: <span className="font-mono break-all">{guide.resourcePath}</span>
              </p>
            )}
          </article>
        </li>
      ))}
    </ul>
  );
}
