'use client';

import { useId, useState, type Ref } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { describeRoute, entryModeText, filterScreens, permissionText, screenName } from './menuScreens';

const VISIBLE_SCREENS = 20;

/** 고른 경로가 여는 화면·진입 권한, 또는 경로가 화면 목록과 어긋나는 사실. */
export function RouteFacts({ route }: { route: string | null }) {
  const described = describeRoute(route);
  switch (described.kind) {
    case 'none':
      return <p className="text-xs text-muted-foreground">연결 경로가 없습니다 — 하위 메뉴를 묶는 분류 메뉴입니다.</p>;
    case 'legacy':
      return <p className="text-xs text-muted-foreground">이전 방식(.do) 경로입니다. 앱 화면 목록에는 없습니다.</p>;
    case 'alias':
      return (
        <p className="text-xs text-warning-emphasis">
          다른 화면으로 넘어가는 경로입니다: {described.target ?? '목적지 미확인'}. 넘어간 화면의 경로로 연결하는 것이 좋습니다.
        </p>
      );
    case 'unknown':
      return <p className="text-xs text-warning-emphasis">화면 목록에 없는 경로입니다. 이 메뉴를 누르면 화면을 찾지 못할 수 있습니다. 경로를 확인하세요.</p>;
    case 'screen': {
      const { screen } = described;
      return (
        <div className="space-y-0.5 text-xs text-muted-foreground">
          <p>연결 화면: <span className="font-medium text-foreground">{screenName(screen)}</span></p>
          <p>
            진입 권한: {screen.entry.permissions.length > 0
              ? screen.entry.permissions.map((code) => permissionText(code, screen)).join(', ')
              : '없음'} · {entryModeText(screen.entry)}
          </p>
        </div>
      );
    }
  }
}

/**
 * [2026-10-02 D1] 연결 화면 고르기 — 앱 화면 목록(동적 경로 제외)에서 이름·경로로 찾아 고른다. 화면 목록에 없는 경로(쿼리
 * tab·bbsId 가 붙은 경로, 이전 방식 .do)는 '경로 직접 입력' 으로 쓴다. 고른 값은 초안에 바로 반영된다(저장은 '변경 저장').
 */
export function MenuScreenPicker({ route, editable, error, onChange, routeInputRef, directRequest = 0 }: {
  route: string | null;
  editable: boolean;
  /** 경로 형식 오류(검증은 초안 요약이 한다). */
  error?: string;
  onChange: (route: string) => void;
  /** '경로 직접 입력' 칸 — 입력 오류의 '고치기' 가 이 칸으로 포커스를 옮긴다. */
  routeInputRef?: Ref<HTMLInputElement>;
  /** 0 이 아닌 새 값이 오면 '경로 직접 입력' 칸을 연다(형식이 틀린 경로는 목록에서 고칠 수 없다). */
  directRequest?: number;
}) {
  const baseId = useId();
  const current = (route ?? '').trim();
  const [direct, setDirect] = useState(() => current !== '' && describeRoute(current).kind !== 'screen');
  const [seenDirectRequest, setSeenDirectRequest] = useState(directRequest);
  if (directRequest !== seenDirectRequest) {
    setSeenDirectRequest(directRequest);
    if (directRequest !== 0) setDirect(true);
  }
  const [keyword, setKeyword] = useState('');
  const screens = filterScreens(keyword);
  const errorId = `${baseId}-error`;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span id={`${baseId}-label`} className="text-xs font-medium text-foreground">연결 화면</span>
        {editable && (
          <Button type="button" size="sm" variant="ghost" onClick={() => setDirect((value) => !value)}>
            {direct ? '화면 목록에서 고르기' : '경로 직접 입력'}
          </Button>
        )}
      </div>
      <p className="break-all text-sm text-foreground">{current || '연결 없음'}</p>
      <RouteFacts route={current || null} />
      {editable && direct && (
        <div className="space-y-1">
          <label htmlFor={`${baseId}-route`} className="text-xs font-medium text-foreground">연결 경로</label>
          <Input
            ref={routeInputRef}
            id={`${baseId}-route`}
            value={route ?? ''}
            maxLength={500}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : `${baseId}-hint`}
            onChange={(event) => onChange(event.target.value)}
            placeholder="/admin/system/menus"
          />
          <p id={`${baseId}-hint`} className="text-xs text-muted-foreground">
            /로 시작하는 앱 경로를 씁니다. 쿼리는 tab·bbsId 만 쓸 수 있고, 이전 방식 .do 경로도 쓸 수 있습니다. 비우면 분류 메뉴가 됩니다.
          </p>
        </div>
      )}
      {editable && !direct && (
        <div className="space-y-1">
          <Input
            aria-label="연결할 화면 검색"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="화면 이름·경로로 찾기"
          />
          <p className="text-xs text-muted-foreground">
            화면 {screens.length.toLocaleString()}개{screens.length > VISIBLE_SCREENS ? ` 가운데 ${VISIBLE_SCREENS}개를 보입니다 — 검색어로 좁히세요` : ''}.
          </p>
          <ul aria-labelledby={`${baseId}-label`} className="max-h-60 space-y-0.5 overflow-auto">
            {screens.slice(0, VISIBLE_SCREENS).map((screen) => {
              const selected = screen.route === current;
              return (
                <li key={screen.route}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onChange(screen.route)}
                    className={cn(
                      'flex w-full flex-wrap items-baseline gap-x-2 rounded px-2 py-1 text-left text-sm',
                      selected ? 'bg-primary/10' : 'hover:bg-muted',
                    )}
                  >
                    <span className="font-medium text-foreground">{screenName(screen)}</span>
                    <span className="text-xs text-muted-foreground">{screen.route}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {current && (
            <Button type="button" size="sm" variant="outline" onClick={() => onChange('')}>연결 화면 해제</Button>
          )}
        </div>
      )}
      {error && <p id={errorId} className="text-xs text-destructive-emphasis">{error}</p>}
    </div>
  );
}
