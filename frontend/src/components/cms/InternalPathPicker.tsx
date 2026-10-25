'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StandardTabs, TabPanel, standardTabId } from '@/app/components/ui/standard-tabs';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { isInternalHref, safeHref } from '@/lib/cms/document';
import { cmsPageRoute } from '@/lib/cms/page-menu-links';
import { cmsQueryOptions } from '@/queries/cms-query-options';
import { SCREEN_ALIASES, SCREEN_REGISTRY, findScreen, type ScreenRegistryEntry } from '@/types/generated-screen-registry';

/**
 * 사이트 안 주소 고르기(ADR-0042). 바로가기 칸과 서식 본문의 링크가 게시 중인 콘텐츠 페이지나 앱 화면의 주소를 직접 외워 쓰지 않게,
 * 목록에서 골라 채운다. 고른 값은 주소 문자열일 뿐이다 — 저장 판정은 문서 검증기(safeHref)가, 열람 판정은 서버·라우트 게이트가 한다.
 *
 * 함께 두는 주소 점검(internalPathWarning)은 막지 않는 안내다. 사이트 안 주소가 알려진 화면도 게시된 페이지도 아니면 사용자가 열 수
 * 없을 수 있다고, /api/ 주소면 내려받기 파일 칸을 쓰라고 알린다. 판정할 수 없을 때(게시 목록을 아직 못 읽었거나 다 읽지 못했을 때)는
 * 아무 말도 하지 않는다 — 틀린 경고가 맞는 주소를 의심하게 만들지 않는다.
 */

export interface InternalPathChoice {
  /** 채울 주소(/로 시작하는 사이트 안 경로). */
  path: string;
  /** 고른 대상의 이름 — 이름 칸이 비어 있을 때 채운다. 모르면 빈 글자. */
  title: string;
}

/** 콘텐츠 페이지 사용자 주소(cmsPageRoute 가 만드는 /pages/<주소>)의 모양. */
const CMS_PAGE_PATH = /^\/pages\/([^/]+)\/?$/;

/** 주소가 콘텐츠 페이지(/pages/<주소>)를 가리키면 그 페이지 주소, 아니면 null. 쿼리·해시는 떼고 본다. */
export function cmsPageAddressOf(url: string): string | null {
  const path = url.trim().split(/[?#]/, 1)[0];
  return CMS_PAGE_PATH.exec(path)?.[1] ?? null;
}

/** 게시 중인 페이지 주소를 아는 정도. 목록이 상한보다 길면 complete 가 false 다(목록에 없다고 게시되지 않은 것은 아니다). */
export type PublishedPageLookup =
  | { status: 'unknown' }
  | { status: 'ready'; addresses: ReadonlySet<string>; complete: boolean };

export const API_PATH_WARNING = '/api/ 주소는 사용자가 여는 화면이 아닙니다. 파일은 내려받기 파일 칸을 쓰세요.';
export const UNKNOWN_PATH_WARNING = '사용자가 열 수 없는 주소일 수 있습니다. 알려진 화면이나 게시된 페이지의 주소가 아닙니다.';
export const UNPUBLISHED_PAGE_WARNING = '사용자가 열 수 없는 주소일 수 있습니다. 지금 게시 중인 콘텐츠 페이지의 주소가 아닙니다.';
export const ADMIN_SCREEN_NOTE = '관리 화면의 주소입니다. 관리 권한이 없는 사용자는 열 수 없습니다.';

/**
 * 사이트 안 주소의 막지 않는 안내. 허용하지 않는 주소·바깥 주소·빈 주소는 null 이다(허용 판정은 문서 검증기의 일이다).
 * 별칭(다른 화면으로 넘기는 경로)은 열리는 주소로 본다.
 */
export function internalPathWarning(url: string, published: PublishedPageLookup): string | null {
  const href = safeHref(url);
  if (!href || !isInternalHref(href)) return null;
  const path = href.split(/[?#]/, 1)[0];
  if (path === '/api' || path.startsWith('/api/')) return API_PATH_WARNING;
  const address = cmsPageAddressOf(path);
  if (address !== null) {
    if (published.status !== 'ready' || !published.complete || published.addresses.has(address)) return null;
    return UNPUBLISHED_PAGE_WARNING;
  }
  const normalized = path.replace(/\/+$/, '') || '/';
  if (SCREEN_ALIASES.some((alias) => alias.route === normalized)) return null;
  const screen = findScreen(path);
  if (!screen) return UNKNOWN_PATH_WARNING;
  return screen.shellAccess === 'admin-system' ? ADMIN_SCREEN_NOTE : null;
}

/** 주소 점검에 쓰는 게시 목록의 크기 — 목록 조회 상한(ADR-0036 size 1~100)이다. */
const LOOKUP_SIZE = 100;

/** 게시 중인 페이지 주소 목록. enabled 일 때만 읽는다(/pages/ 주소가 있을 때). 읽지 못하면 unknown 이다. */
export function usePublishedPageLookup(enabled: boolean): PublishedPageLookup {
  const { data } = useQuery({
    ...cmsQueryOptions.published({ keyword: '', page: 1, size: LOOKUP_SIZE }),
    enabled,
    staleTime: 60_000,
  });
  return React.useMemo<PublishedPageLookup>(() => {
    if (!data) return { status: 'unknown' };
    const addresses = new Set(data.list.map((row) => row.contsPathNm).filter((value): value is string => Boolean(value)));
    return { status: 'ready', addresses, complete: data.total <= data.list.length };
  }, [data]);
}

const screenName = (screen: ScreenRegistryEntry): string => screen.label ?? '이름 미확인';

/**
 * 고를 수 있는 앱 화면 — 시연 화면과 콘텐츠 페이지 주소(그것은 '콘텐츠 페이지' 탭에서 고른다)를 뺀다. 주소에 번호가 들어가는
 * 화면(동적 경로)은 고를 수 없음을 표시하려고 목록 뒤에 둔다.
 */
const PICKABLE_SCREENS: readonly ScreenRegistryEntry[] = SCREEN_REGISTRY
  .filter((screen) => !screen.demo && !(screen.dynamic && screen.route.startsWith('/pages/')))
  .slice()
  .sort((left, right) => Number(left.dynamic) - Number(right.dynamic)
    || screenName(left).localeCompare(screenName(right), 'ko')
    || left.route.localeCompare(right.route, 'en'));

const VISIBLE_SCREENS = 30;
const PAGE_SIZE = 20;
const ROW_CLASS = 'flex w-full flex-wrap items-center gap-x-2 gap-y-0.5 rounded px-2 py-1.5 text-left text-sm';

type PickerTab = 'pages' | 'screens';
const TABS: { id: PickerTab; label: string }[] = [
  { id: 'pages', label: '콘텐츠 페이지' },
  { id: 'screens', label: '앱 화면' },
];

export interface InternalPathPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 목록에서 고르면 부른다. 대화상자는 그 뒤 닫힌다. */
  onSelect: (choice: InternalPathChoice) => void;
  /** 닫힐 때의 포커스 처리. 부른 단추가 사라지는 자리(링크 입력 팝오버)는 막고 스스로 옮긴다. */
  onCloseAutoFocus?: (event: Event) => void;
}

export function InternalPathPicker({ open, onOpenChange, onSelect, onCloseAutoFocus }: InternalPathPickerProps) {
  const baseId = React.useId();
  const [tab, setTab] = React.useState<PickerTab>('pages');
  const panelId = `${baseId}-panel`;
  const choose = (choice: InternalPathChoice) => {
    onSelect(choice);
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl" onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader>
          <DialogTitle>사이트 안에서 고르기</DialogTitle>
          <DialogDescription>게시 중인 콘텐츠 페이지나 앱 화면을 고르면 주소를 채웁니다.</DialogDescription>
        </DialogHeader>
        <StandardTabs items={TABS} activeTab={tab} onChange={(id) => setTab(id as PickerTab)} label="고를 곳"
          idPrefix={baseId} panelId={panelId} />
        <TabPanel id={panelId} aria-labelledby={standardTabId(baseId, tab)}>
          {tab === 'pages' ? <PublishedPagesPane onChoose={choose} /> : <ScreensPane onChoose={choose} />}
        </TabPanel>
      </DialogContent>
    </Dialog>
  );
}

function PublishedPagesPane({ onChoose }: { onChoose: (choice: InternalPathChoice) => void }) {
  const inputId = React.useId();
  const [keyword, setKeyword] = React.useState('');
  const debounced = useDebouncedValue(keyword.trim(), 300);
  const query = useQuery(cmsQueryOptions.published({ keyword: debounced, page: 1, size: PAGE_SIZE }));
  const rows = (query.data?.list ?? []).filter((row): row is typeof row & { contsPathNm: string } => Boolean(row.contsPathNm));
  const total = query.data?.total ?? 0;
  return (
    <div className="space-y-2 pt-2">
      <label htmlFor={inputId} className="block text-sm font-medium text-foreground">게시된 페이지 찾기</label>
      <Input id={inputId} value={keyword} placeholder="제목·요약으로 찾기" onChange={(event) => setKeyword(event.target.value)} />
      {query.isPending ? (
        <p role="status" className="text-sm text-muted-foreground">게시된 페이지를 불러오는 중입니다.</p>
      ) : query.isError ? (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-destructive-emphasis">
          <span>게시된 페이지 목록을 불러오지 못했습니다. 다시 시도하거나 주소를 직접 입력해 주세요.</span>
          <Button type="button" size="sm" variant="outline" onClick={() => void query.refetch()}>다시 시도</Button>
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {debounced ? '찾는 말에 맞는 게시된 페이지가 없습니다.' : '지금 게시 중인 콘텐츠 페이지가 없습니다.'}
        </p>
      ) : (
        <>
          {total > rows.length && (
            <p className="text-xs text-muted-foreground">
              게시된 페이지 {total.toLocaleString()}개 가운데 최근 게시한 {rows.length}개를 보입니다. 제목으로 좁혀 찾으세요.
            </p>
          )}
          <ul aria-label="게시된 페이지" className="max-h-72 space-y-0.5 overflow-auto">
            {rows.map((row) => {
              const path = cmsPageRoute(row.contsPathNm);
              return (
                <li key={row.contsPathNm}>
                  <button type="button" className={`${ROW_CLASS} hover:bg-muted`}
                    onClick={() => onChoose({ path, title: row.contsTtl ?? '' })}>
                    <span className="font-medium text-foreground">{row.contsTtl || row.contsPathNm}</span>
                    <span className="text-xs text-muted-foreground">{path}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function ScreensPane({ onChoose }: { onChoose: (choice: InternalPathChoice) => void }) {
  const inputId = React.useId();
  const [keyword, setKeyword] = React.useState('');
  const needle = keyword.trim().toLocaleLowerCase('ko-KR');
  const matches = needle
    ? PICKABLE_SCREENS.filter((screen) => `${screen.label ?? ''} ${screen.route}`.toLocaleLowerCase('ko-KR').includes(needle))
    : PICKABLE_SCREENS;
  return (
    <div className="space-y-2 pt-2">
      <label htmlFor={inputId} className="block text-sm font-medium text-foreground">화면 찾기</label>
      <Input id={inputId} value={keyword} placeholder="화면 이름·주소로 찾기" onChange={(event) => setKeyword(event.target.value)} />
      <p className="text-xs text-muted-foreground">
        화면 {matches.length.toLocaleString()}개{matches.length > VISIBLE_SCREENS ? ` 가운데 ${VISIBLE_SCREENS}개를 보입니다. 찾는 말로 좁히세요` : ''}.
        &lsquo;관리 화면&rsquo;은 관리 권한이 있는 사용자만 열 수 있습니다. 주소에 번호가 들어가는 화면은 여기서 고를 수 없으니 주소 칸에 직접 입력하세요.
      </p>
      {matches.length === 0 ? (
        <p className="text-sm text-muted-foreground">찾는 말에 맞는 화면이 없습니다.</p>
      ) : (
        <ul aria-label="앱 화면" className="max-h-72 space-y-0.5 overflow-auto">
          {matches.slice(0, VISIBLE_SCREENS).map((screen) => {
            const admin = screen.shellAccess === 'admin-system' ? <Badge variant="outline">관리 화면</Badge> : null;
            if (screen.dynamic) {
              return (
                <li key={screen.route} className={`${ROW_CLASS} text-muted-foreground`}>
                  <span className="font-medium">{screenName(screen)}</span>
                  <span className="text-xs">{screen.route}</span>
                  <Badge variant="outline">번호 직접 입력</Badge>
                  {admin}
                </li>
              );
            }
            return (
              <li key={screen.route}>
                <button type="button" className={`${ROW_CLASS} hover:bg-muted`}
                  onClick={() => onChoose({ path: screen.route, title: screen.label ?? '' })}>
                  <span className="font-medium text-foreground">{screenName(screen)}</span>
                  <span className="text-xs text-muted-foreground">{screen.route}</span>
                  {admin}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
