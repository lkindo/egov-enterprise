'use client';

import React, { forwardRef, type KeyboardEvent } from 'react';
import { Slot } from 'radix-ui';
import { cn } from '@/lib/utils';

/*
 * 탭 하나의 원천(2026-10-18). 화면마다 손으로 만든 탭 목록 가운데 방향키가 되는 곳은 둘뿐이었고, 여러 곳은
 * aria-controls·tabpanel 이 없었으며, 이 파일의 StandardTabs 는 탭을 aria-pressed 토글로 말했다. WAI-ARIA APG 의 탭
 * 패턴을 여기 한 곳에 둔다.
 *
 * - role=tablist / tab / tabpanel, aria-selected, aria-controls ↔ aria-labelledby. id 는 호출자가 정한다 — e2e·계약이 읽는
 *   id 를 그대로 두기 위해서다.
 * - roving tabindex: 고른 탭만 Tab 순서에 들고(0) 나머지는 -1 이다.
 * - 방향키(가로 ←/→, 세로 ↑/↓)·Home·End 로 포커스를 옮기고 끝에서 처음으로 돈다. 꺼진 탭은 건너뛴다.
 * - 고르기는 **클릭과 같은 길**이다. automatic(기본)은 옮긴 탭을 click() 하고, manual 은 포커스만 옮긴 뒤 Enter·Space(버튼의
 *   기본 동작)로 고른다. 탭을 고르면 페이지를 옮기는 탭 목록은 manual 을 쓴다(방향키 한 번마다 이동하지 않게).
 *
 * 의존성 없는 구현이다. Radix Tabs 는 mousedown 으로 고르고 탭 id 를 스스로 만들며 패널을 값마다 두게 한다 — 허브들은
 * 활성 패널 하나에 고정 id 를 두고 URL 로 탭을 고른다.
 *
 * 새 탭 목록은 이 파일의 TabList·Tab·TabPanel 로 만든다. 손으로 쓴 role="tablist"·"tab"·"tabpanel" 은 eslint 의
 * no-restricted-syntax 가 막는다(frontend/eslint.config.mjs).
 */

export type TabActivation = 'automatic' | 'manual';
export type TabOrientation = 'horizontal' | 'vertical';

const TAB_SELECTOR = '[role="tab"]';
const TABLIST_SELECTOR = '[role="tablist"]';

function isDisabledTab(tab: HTMLElement): boolean {
  return tab.hasAttribute('disabled') || tab.getAttribute('aria-disabled') === 'true';
}

/** 이 탭 목록에 직접 속한(안쪽의 다른 탭 목록이 아닌) 켜진 탭들, DOM 순서. */
function enabledTabsOf(list: HTMLElement): HTMLElement[] {
  return Array.from(list.querySelectorAll<HTMLElement>(TAB_SELECTOR))
    .filter((tab) => tab.closest(TABLIST_SELECTOR) === list && !isDisabledTab(tab));
}

/** 탭 목록의 키보드 이동. 처리한 키면 true 를 돌려준다. */
export function handleTabListKeyDown(
  event: KeyboardEvent<HTMLElement>,
  { activation = 'automatic', orientation = 'horizontal' }: { activation?: TabActivation; orientation?: TabOrientation } = {},
): boolean {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return false;
  const previousKey = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
  const nextKey = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';
  if (event.key !== previousKey && event.key !== nextKey && event.key !== 'Home' && event.key !== 'End') return false;

  const list = event.currentTarget;
  const current = (event.target as HTMLElement).closest<HTMLElement>(TAB_SELECTOR);
  if (!current || current.closest(TABLIST_SELECTOR) !== list) return false;
  const tabs = enabledTabsOf(list);
  if (tabs.length === 0) return false;

  const index = tabs.indexOf(current);
  let target: HTMLElement;
  if (event.key === 'Home') target = tabs[0];
  else if (event.key === 'End') target = tabs[tabs.length - 1];
  else if (index < 0) target = event.key === nextKey ? tabs[0] : tabs[tabs.length - 1];
  else target = tabs[(index + (event.key === nextKey ? 1 : -1) + tabs.length) % tabs.length];

  event.preventDefault();
  target.focus();
  if (activation === 'automatic' && target.getAttribute('aria-selected') !== 'true') target.click();
  return true;
}

export interface TabListProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'role'> {
  /** automatic(기본): 방향키로 옮긴 탭을 곧바로 고른다. manual: 포커스만 옮기고 Enter·Space 로 고른다. */
  activation?: TabActivation;
  orientation?: TabOrientation;
}

/** role=tablist. 접근 이름은 `aria-label` 또는 `aria-labelledby` 로 준다. */
export const TabList = forwardRef<HTMLDivElement, TabListProps>(function TabList(
  { activation = 'automatic', orientation = 'horizontal', onKeyDown, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      {...rest}
      // eslint-disable-next-line no-restricted-syntax -- 탭 패턴의 원천이다.
      role="tablist"
      aria-orientation={orientation === 'vertical' ? 'vertical' : undefined}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (!event.defaultPrevented) handleTabListKeyDown(event, { activation, orientation });
      }}
    >
      {children}
    </div>
  );
});

export interface TabProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'role' | 'aria-selected'> {
  /** 고른 탭인지. 고른 탭만 Tab 순서에 든다(roving tabindex). */
  selected: boolean;
  /** 자식 요소(예: `<Button>`)에 탭 속성을 얹는다. */
  asChild?: boolean;
}

/** role=tab 버튼. 고르는 동작은 onClick 하나다 — 방향키 이동(automatic)도 이 onClick 을 부른다. */
export const Tab = forwardRef<HTMLButtonElement, TabProps>(function Tab(
  { selected, asChild = false, type = 'button', ...rest },
  ref,
) {
  const Comp = asChild ? Slot.Root : 'button';
  return (
    <Comp
      ref={ref}
      type={type}
      {...rest}
      // eslint-disable-next-line no-restricted-syntax -- 탭 패턴의 원천이다.
      role="tab"
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
    />
  );
});

export interface TabPanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'role'> {
  id: string;
  /** 고른 탭의 id. */
  'aria-labelledby': string;
}

/** role=tabpanel. 활성 패널 하나만 그리는 화면은 이 id 하나를 모든 탭의 aria-controls 로 쓴다. */
export const TabPanel = forwardRef<HTMLDivElement, TabPanelProps>(function TabPanel(props, ref) {
  // eslint-disable-next-line no-restricted-syntax -- 탭 패턴의 원천이다.
  return <div ref={ref} {...props} role="tabpanel" />;
});

interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

/** StandardTabs 가 그리는 탭의 id. 패널의 aria-labelledby 에 쓴다. */
export function standardTabId(idPrefix: string, itemId: string): string {
  return `${idPrefix}-tab-${itemId}`;
}

interface StandardTabsProps {
  items: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  /** 탭 목록의 접근 이름. */
  label: string;
  /** 탭 id 접두어 — 탭 id 는 standardTabId(idPrefix, item.id) 다. */
  idPrefix: string;
  /** 탭이 고르는 패널의 id(TabPanel 로 그린다). */
  panelId: string;
  variant?: 'underline' | 'pills';
  className?: string;
}

/** 항목 배열로 그리는 탭 목록. 패널은 호출자가 `<TabPanel id={panelId} aria-labelledby={standardTabId(...)}>` 로 둔다. */
export function StandardTabs({
  items,
  activeTab,
  onChange,
  label,
  idPrefix,
  panelId,
  variant = 'pills',
  className,
}: StandardTabsProps) {
  const underline = variant === 'underline';
  return (
    <TabList
      aria-label={label}
      className={cn(underline ? 'flex border-b w-full' : 'flex bg-card border rounded-lg p-1.5 w-fit shadow-sm', className)}
    >
      {items.map((item) => {
        const selected = activeTab === item.id;
        return (
          <Tab
            key={item.id}
            id={standardTabId(idPrefix, item.id)}
            selected={selected}
            aria-controls={panelId}
            aria-label={typeof item.count === 'number' ? `${item.label} ${item.count}건` : item.label}
            onClick={() => onChange(item.id)}
            className={cn(
              underline
                ? 'flex items-center gap-2 px-8 py-4 text-sm font-bold border-b-2 transition-all'
                : 'flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all',
              underline
                ? (selected ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground')
                : (selected ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'),
            )}
          >
            {item.icon ? <span aria-hidden="true">{item.icon}</span> : null}
            {item.label}
            {typeof item.count === 'number' ? <span aria-label={`${item.count}건`}>{item.count}</span> : null}
          </Tab>
        );
      })}
    </TabList>
  );
}
