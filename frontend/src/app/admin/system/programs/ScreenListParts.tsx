'use client';

import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ScreenAlias, ScreenRegistryEntry } from '@/types/generated-screen-registry';
import {
  aliasKindLabel,
  aliasTargetLabel,
  screenBadges,
  screenEntrySummary,
  screenMenuLinkSummary,
  type ScreenMenuLinkCell,
} from './screenList';

/**
 * 화면 관리의 표현 조각(2026-10-02 D3). 계산은 screenList.ts 가 하고 여기서는 그리기만 한다.
 * 표·셸은 ProgramAdminClient 하나가 소유한다(A1 채택 census 는 파일 단위로 센다).
 */

export type ProgramAdminTab = 'screens' | 'programs';

const TABS: ReadonlyArray<{ value: ProgramAdminTab; label: string }> = [
  { value: 'screens', label: '화면 목록' },
  { value: 'programs', label: '이전 프로그램' },
];

/**
 * 탭 목록(WAI-ARIA tabs — 방향키·Home·End 로 옮기고 바로 연다). 탭 상태는 화면 안 상태다(URL·저장소에 싣지 않는다).
 * 패널은 활성 탭 하나뿐이라 모든 탭이 같은 패널 id 를 가리킨다.
 */
export function ProgramAdminTabList({
  active,
  onChange,
  idPrefix,
  panelId,
}: {
  active: ProgramAdminTab;
  onChange: (tab: ProgramAdminTab) => void;
  idPrefix: string;
  panelId: string;
}) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const move = (index: number) => {
    const next = TABS[(index + TABS.length) % TABS.length];
    onChange(next.value);
    tabRefs.current[(index + TABS.length) % TABS.length]?.focus();
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowRight') { event.preventDefault(); move(index + 1); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); move(index - 1); }
    else if (event.key === 'Home') { event.preventDefault(); move(0); }
    else if (event.key === 'End') { event.preventDefault(); move(TABS.length - 1); }
  };
  return (
    <div
      role="tablist"
      aria-label="화면 관리 보기 선택"
      className="flex w-fit max-w-full flex-wrap rounded-md border border-border bg-muted/50 p-0.5"
    >
      {TABS.map((tab, index) => {
        const selected = tab.value === active;
        return (
          <button
            key={tab.value}
            ref={(element) => { tabRefs.current[index] = element; }}
            type="button"
            role="tab"
            id={programAdminTabId(idPrefix, tab.value)}
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              'flex h-[var(--control-h-sm)] items-center rounded px-3 text-[length:var(--font-size-body)] transition-colors',
              selected ? 'bg-background font-semibold text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function programAdminTabId(idPrefix: string, tab: ProgramAdminTab): string {
  return `${idPrefix}-tab-${tab}`;
}

/** 화면 이름 칸 — 이름이 없으면 지어내지 않고 '이름 미확인' 으로 흐리게 보인다. */
export function ScreenNameCell({ screen, name }: { screen: ScreenRegistryEntry; name: string }) {
  return (
    <span className={cn('block text-left font-semibold', screen.label ? 'text-foreground' : 'text-muted-foreground')}>
      {name}
    </span>
  );
}

/** 진입 권한 칸 — 권한 이름(코드)과 열리는 조건. */
export function ScreenEntryCell({ screen }: { screen: ScreenRegistryEntry }) {
  const summary = screenEntrySummary(screen);
  return (
    <div className="space-y-0.5 text-left text-sm">
      {summary.permissions.length > 0 && (
        <ul className="space-y-0.5">
          {summary.permissions.map((permission) => (
            <li key={permission.code} className="text-foreground">
              {permission.name}
              {permission.name !== permission.code && (
                <span className="ml-1 font-mono text-xs text-muted-foreground">({permission.code})</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {summary.rule && <p className="text-xs text-muted-foreground">{summary.rule}</p>}
    </div>
  );
}

/**
 * 연결 메뉴 칸. 연결이 있으면 펼쳐서 메뉴 이름을 본다(사용 안 함·별칭 경유를 표시한다). 메뉴를 불러오는 중이거나
 * 조회가 거부·실패하면 0건('연결 없음')으로 말하지 않는다. 실패 문구는 전경 전용 토큰(-emphasis)이다.
 */
export function ScreenMenuLinkCellView({ cell }: { cell: ScreenMenuLinkCell }) {
  const summary = screenMenuLinkSummary(cell);
  if (cell.kind === 'linked') {
    return (
      <details className="text-left text-sm">
        <summary className="cursor-pointer font-medium text-foreground">{summary}</summary>
        <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
          {cell.menus.map((menu) => (
            <li key={menu.menuNo}>
              {menu.menuNm}
              <span className="ml-1 font-mono">(ID: {menu.menuNo})</span>
              {!menu.inUse && <span className="ml-1">· 사용 안 함</span>}
              {menu.viaAlias && <span className="ml-1">· {menu.viaAlias} 경유</span>}
            </li>
          ))}
        </ul>
      </details>
    );
  }
  return (
    <span
      className={cell.kind === 'failed' ? 'text-sm text-destructive-emphasis' : 'text-sm text-muted-foreground'}
      aria-busy={cell.kind === 'checking' || undefined}
    >
      {summary}
    </span>
  );
}

/** 구분 배지. */
export function ScreenBadgeList({ screen, cell }: { screen: ScreenRegistryEntry; cell: ScreenMenuLinkCell }) {
  const badges = screenBadges(screen, cell);
  if (badges.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {badges.map((badge) => (
        <Badge key={badge} variant="outline" className="text-xs">{badge}</Badge>
      ))}
    </span>
  );
}

/**
 * 다른 화면으로 넘어가는 경로(별칭). 화면이 아니므로 링크하지 않는다 — 경로·목적지·넘기는 곳만 보인다.
 */
export function ScreenAliasList({
  aliases,
  total,
  keywordApplied,
}: {
  aliases: readonly ScreenAlias[];
  total: number;
  keywordApplied: boolean;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="space-y-2 rounded-md border border-border bg-card p-[var(--filter-pad)]">
      <h2 id={headingId} className="text-[length:var(--font-size-body)] font-semibold text-foreground">
        다른 화면으로 넘어가는 경로 {keywordApplied ? `${aliases.length} / ${total}개` : `${total}개`}
      </h2>
      <p className="text-xs text-muted-foreground">
        이 경로로 들어오면 다른 화면으로 넘어갑니다. 화면이 아니므로 메뉴에 추가하지 않습니다. 검색어로만 거릅니다.
      </p>
      {aliases.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {keywordApplied ? '검색어와 맞는 경로가 없습니다.' : '다른 화면으로 넘어가는 경로가 없습니다.'}
        </p>
      ) : (
        <ul className="divide-y divide-border text-sm">
          {aliases.map((alias) => (
            <li key={alias.route} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 py-1.5">
              <span className="font-mono text-foreground">{alias.route}</span>
              <span aria-hidden="true" className="text-muted-foreground">→</span>
              <span className="sr-only">넘어가는 곳:</span>
              <span className="font-mono text-foreground">{aliasTargetLabel(alias.target)}</span>
              <span className="text-xs text-muted-foreground">· {aliasKindLabel(alias)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** 탭 패널 위 한 줄 설명. */
export function PanelNote({ children }: { children: ReactNode }) {
  return <p className="text-[length:var(--font-size-body)] text-muted-foreground">{children}</p>;
}
