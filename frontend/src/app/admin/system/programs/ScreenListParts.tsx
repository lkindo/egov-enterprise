'use client';

import { Fragment, useId, type ReactNode, type Ref } from 'react';
import { CircleHelp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { ScreenRegistryEntry } from '@/types/generated-screen-registry';
import {
  screenBadges,
  screenEntryMarker,
  screenEntrySummary,
  screenMenuLinkNeedsDetails,
  screenMenuLinkSummary,
  viewNeedsMenuStructure,
  type ScreenListView,
  type ScreenMenuLinkCell,
} from './screenList';

/**
 * 화면 관리의 표현 조각(2026-10-02 D3). 계산은 screenList.ts 가 하고 여기서는 그리기만 한다.
 * 표·셸은 ProgramAdminClient 하나가 소유한다(A1 채택 census 는 파일 단위로 센다).
 * [2026-10-04 프로그램 목록 퇴역] '이전 프로그램' 탭을 걷어 탭 목록 조각도 걷었다 — 화면 목록 하나만 남았다.
 * [2026-10-05 한 화면 압축] 행을 한 줄로 줄였다(진입 권한 칩·연결 메뉴 '첫 이름 외 N개'). 표 아래에 늘 펼쳐 두던
 *   '다른 화면으로 넘어가는 경로' 목록과 표 위 설명 문단을 걷었다 — 앞의 것은 '넘어가는 경로' 보기로 표 자리에, 뒤의 것은
 *   제목 옆 '집계 기준' 도움말로 옮겼다.
 */


/** 화면 이름 칸 — 이름이 없으면 지어내지 않고 '이름 미확인' 으로 흐리게 보인다. */
export function ScreenNameCell({ screen, name }: { screen: ScreenRegistryEntry; name: string }) {
  return (
    <span className={cn('block text-left font-semibold', screen.label ? 'text-foreground' : 'text-muted-foreground')}>
      {name}
    </span>
  );
}

/**
 * 경로 표기(화면 경로·넘어가는 경로·목적지). 말줄임하지 않는다 — 경로는 이 화면에서 화면을 가리키는 필수 정보라 생략한 채
 * 마우스를 올려야만 보이는 title 에 두지 않는다(헌법 제16조 2항). 대신 줄바꿈은 '/' 뒤에서만 일어나게 해(<wbr>) 칸이 넉넉하면
 * 한 줄, 좁으면 경로 단위로 접힌다. 생략이 없으니 title 도 두지 않는다(같은 글자를 보조기술이 두 번 읽지 않게).
 */
export function RouteText({ route, className }: { route: string; className?: string }) {
  const parts = route.split('/');
  return (
    <span className={cn('block text-left font-mono text-xs', className)}>
      {parts.map((part, index) => (
        // 경로 조각의 순서가 곧 정체다 — 조각이 같아도(빈 조각) 위치가 다르므로 위치를 키로 쓴다.
        <Fragment key={index}>
          {index > 0 && <>/<wbr /></>}
          {part}
        </Fragment>
      ))}
    </span>
  );
}

/**
 * 진입 권한 칩 하나 — 칩에는 권한 이름('업무 · 행위')만 보이고, 코드는 보조기술용 글자로만 둔다. 이 화면에서 코드는 생략하는
 * 내부 표기다 — 권한 이름이 코드와 일대일이라(같은 이름의 다른 권한이 없다 — screenList.test 가 고정) 이름만으로 권한을 가리킬
 * 수 있고, 헌법 제16조 4항은 내부 구현 용어를 화면에 늘어놓지 않게 한다(권한이 둘 이상인 칸의 펼침과 권한 작업대는 코드를
 * 함께 보인다). [2026-10-05 반박 리뷰] 종전에는 코드를 칩의 title 에도 두었는데, title 은 포커스를 받지 않는 칩에서 마우스를
 * 올려야만 보여 키보드·터치 사용자에게 같은 길이 없었다(제16조 3항). 생략하기로 한 정보이므로 hover 전용 길을 남기지 않는다.
 * sr-only 글자를 품으므로 칩 자신이 위치 기준이다(스크롤 상자 계약).
 */
function PermissionChip({ permission }: { permission: { code: string; name: string } }) {
  return (
    <span
      data-permission-code={permission.code}
      className="relative inline-flex items-center whitespace-nowrap rounded border border-border bg-muted px-1.5 text-xs leading-5 text-foreground"
    >
      {permission.name}
      {permission.name !== permission.code && <span className="sr-only">{` (${permission.code})`}</span>}
    </span>
  );
}

/**
 * 진입 권한 칸 — 한 줄(2026-10-05). 권한이 하나면 이름 칩 하나다. 권한이 없으면 열리는 조건 문장이다.
 * 권한이 둘 이상이면 '모두'(ALL)·'하나'(ANY) 표지와 첫 권한 칩, '외 N개' 를 한 줄 요약으로 두고 전체 목록(이름과 코드)은
 * 펼침(details — 키보드·터치로 열린다)으로 보인다. 칩을 여러 개 늘어놓으면 권한 넷인 화면이 칸 안에서 두세 줄로 접혔다
 * (2026-10-05 구조 재현 실측). 나머지 권한을 마우스를 올려야만 보이는 title 에 두지 않는다(헌법 제16조 2항). 표지의 뜻은
 * 보조기술용 문장과 '집계 기준' 도움말이 말한다. 연결 메뉴 칸('첫 메뉴 외 N개')과 같은 모양이다.
 */
export function ScreenEntryCell({ screen }: { screen: ScreenRegistryEntry }) {
  const summary = screenEntrySummary(screen);
  const marker = screenEntryMarker(screen);
  if (summary.permissions.length === 0) {
    return <span className="block text-left text-xs text-muted-foreground">{summary.rule}</span>;
  }
  const [first, ...rest] = summary.permissions;
  if (!marker || rest.length === 0) {
    return <span className="flex items-center text-left"><PermissionChip permission={first} /></span>;
  }
  return (
    <details className="text-left text-sm" data-entry-details="">
      <summary className="cursor-pointer text-foreground">
        <span title={marker.rule} className="relative text-xs font-semibold text-muted-foreground">
          <span aria-hidden="true">{marker.label}</span>
          <span className="sr-only">{`${marker.rule}:`}</span>
        </span>
        {' '}
        <PermissionChip permission={first} />
        {' '}
        <span className="text-xs text-muted-foreground">{`외 ${rest.length}개`}</span>
      </summary>
      <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
        {summary.permissions.map((permission) => (
          <li key={permission.code} data-entry-permission={permission.code}>
            <span className="text-foreground">{permission.name}</span>
            {permission.name !== permission.code && <span className="ml-1 font-mono">({permission.code})</span>}
          </li>
        ))}
      </ul>
    </details>
  );
}

/**
 * 연결 메뉴 칸 — 한 줄 요약('첫 메뉴 이름 외 N개', 사용 중인 메뉴가 먼저). 요약이 말하지 않는 사실(나머지 메뉴·메뉴 ID·사용
 * 안 함·별칭 경유)이 있으면 펼침(details — 키보드·터치로 열린다)으로 보인다. 메뉴를 불러오는 중이거나 조회가 거부·실패하면
 * 0건('연결 없음')으로 말하지 않는다. 실패 문구는 전경 전용 토큰(-emphasis)이다.
 */
export function ScreenMenuLinkCellView({ cell }: { cell: ScreenMenuLinkCell }) {
  const summary = screenMenuLinkSummary(cell);
  if (cell.kind === 'linked' && screenMenuLinkNeedsDetails(cell)) {
    return (
      <details className="text-left text-sm">
        <summary className="cursor-pointer text-foreground">{summary}</summary>
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
  if (cell.kind === 'linked') {
    // 사용 중인 메뉴 하나가 직접 여는 화면 — 펼칠 거리가 없으니 메뉴 ID 는 보조기술용 글자로만 둔다(이 칸에는 메뉴가 하나라
    // 이름만으로 그 메뉴를 가리킨다 — ID 는 생략하는 보조 정보다). [2026-10-05 반박 리뷰] 종전에는 title 에도 두었는데, 포커스를
    // 받지 않는 칸에서 마우스를 올려야만 보여 키보드·터치 사용자에게 같은 길이 없었다(헌법 제16조 3항). 메뉴가 여럿이거나
    // 사용 안 함·다른 경로를 거치면 펼침이 ID 를 보인다. sr-only 글자를 품으므로 위치 기준을 둔다(스크롤 상자 계약).
    const [menu] = cell.menus;
    return (
      <span className="relative block text-left text-sm text-foreground">
        {summary}
        <span className="sr-only">{` (메뉴 ID: ${menu.menuNo})`}</span>
      </span>
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
        <Badge key={badge} variant="outline" className="px-1 py-0 text-xs">{badge}</Badge>
      ))}
    </span>
  );
}

/**
 * 보기 단추 묶음(2026-10-05 시안 복원) — 결과 도구 줄의 '총 N건' 과 같은 줄에 둔다. 건수를 붙인 단추 하나가 보기 하나이고
 * (aria-pressed), 누르면 바로 바뀐다. Fiori 목록 보고서의 '여러 보기'(표 도구 줄의 건수 붙은 분할 단추)와 같은 자리다.
 * 검색어(조회 조건)는 그대로 조회/Enter 로 적용한다(G2).
 *
 * 메뉴 구조를 모르면(불러오는 중·권한 없음·실패) 메뉴에 연결된 화면·메뉴에 없는 화면 단추는 건수를 '—' 로 두고 그 이유
 * (hint)를 aria-describedby 로 잇는다. 그 단추는 고를 수 없다(aria-disabled — 포커스는 남아 이유를 읽을 수 있다). 이미
 * 고른 단추는 막지 않는다(고른 보기가 사라지지 않게). 이유 문장은 권한 없음·실패일 때 보이고, 불러오는 중에는 표가 불러오는
 * 중임을 보이므로 보조기술용으로만 둔다. 처음 보기를 정하기 전(value null)에는 어떤 단추도 눌림이 아니다 — 곧 정해질 보기를
 * 미리 눌림으로 두면 조회가 실패해 '전체' 로 정해질 때 눌림 상태가 말없이 뒤집힌다(2026-10-05 반박 리뷰).
 */
export function ScreenViewChips({
  options,
  value,
  groupRef,
  counts,
  menuStructureKnown,
  hint,
  hintVisible,
  onChange,
}: {
  options: ReadonlyArray<{ value: ScreenListView; label: string }>;
  /** 지금 보기. null 이면 아직 처음 보기를 정하지 못했다 — 어떤 단추도 눌림으로 두지 않는다. */
  value: ScreenListView | null;
  /** 단추 묶음(화면이 다시 불러오기 뒤 눌린 단추로 포커스를 옮길 때 쓴다). */
  groupRef?: Ref<HTMLDivElement>;
  counts: Record<ScreenListView, number | null>;
  menuStructureKnown: boolean;
  hint: string | null;
  hintVisible: boolean;
  onChange: (view: ScreenListView) => void;
}) {
  const hintId = useId();
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <div ref={groupRef} role="group" aria-label="화면 목록 보기" className="flex flex-wrap items-center gap-1">
        {options.map((option) => {
          const pressed = value === option.value;
          const count = counts[option.value];
          const unknown = viewNeedsMenuStructure(option.value) && !menuStructureKnown;
          const blocked = unknown && !pressed;
          return (
            // 기본 단추의 작은 크기(xs, 24px — WCAG 2.5.8 하한)를 쓴다. 화면이 높이를 덧붙이지 않는다(밀도 계약).
            <Button
              key={option.value}
              type="button"
              size="xs"
              variant={pressed ? 'default' : 'outline'}
              aria-pressed={pressed}
              aria-disabled={blocked || undefined}
              aria-describedby={unknown && hint ? hintId : undefined}
              data-view={option.value}
              onClick={() => { if (!blocked && !pressed) onChange(option.value); }}
              className={cn(
                'relative rounded-full px-2.5 text-xs',
                !pressed && 'text-foreground',
                // 고를 수 없는 단추는 흐리게 둔다(비활성 컨트롤은 대비 기준 예외 — 이유는 aria-describedby 문장이 말한다).
                blocked && 'cursor-not-allowed opacity-70 hover:bg-background hover:text-foreground',
              )}
            >
              <span>{option.label}</span>
              {/* 접근 이름에 이름과 건수 사이 띄어쓰기를 둔다(flex 항목 사이 공백은 화면에 그려지지 않는다 — 간격은 gap 이다). */}
              {' '}
              {count === null ? (
                <>
                  <span aria-hidden="true">—</span>
                  <span className="sr-only">건수 모름</span>
                </>
              ) : (
                <span className="font-bold tabular-nums">{count.toLocaleString()}</span>
              )}
            </Button>
          );
        })}
      </div>
      {hint && (
        <p id={hintId} className={hintVisible ? 'text-xs text-muted-foreground' : 'sr-only'}>{hint}</p>
      )}
    </div>
  );
}

/**
 * '집계 기준' 도움말(2026-10-05) — 표 위에 늘 펼쳐 두던 세 문장 설명을 제목 옆 단추 하나로 옮겼다. 누르면(키보드·터치
 * 포함) 내용이 겹쳐 뜨고, 마우스를 올려야만 보이는 툴팁이 아니다(헌법 제16조 2·3항). 겹쳐 뜨는 상자가 조회 조건·보기
 * 단추·표 첫 행을 가리므로 포커스를 옮기지 않고도 걷을 수 있어야 한다(WCAG 2.4.11) — 공용 Popover(Radix)라 Esc·바깥
 * 누르기로 닫히고 포커스가 상자 밖으로 나가도 닫히며, Esc 로 닫으면 포커스가 단추로 돌아온다. 펼친 내용이 아래 영역을
 * 밀지 않으므로 펼칠 때마다 표 높이가 바뀌지 않는다. 화면 가장자리에 닿으면 Popover 가 자리를 옮긴다.
 * [2026-10-05 반박 리뷰] 처음에는 네이티브 details 였는데 요약을 다시 누를 때만 닫혀 2.4.11 을 어겼다.
 */
export function CountingRuleHelp({ children }: { children: ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <CircleHelp aria-hidden="true" />
          집계 기준
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        collisionPadding={16}
        aria-label="집계 기준"
        className="w-[min(30rem,calc(100vw-2rem))] space-y-1.5 p-3 text-sm"
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
