'use client';

import { useCallback, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { pickAllowedParams } from '@/lib/navigation/allowlist-params';
import { useOptionalAuth } from '@/contexts/AuthContext';
import { isHubTab, visibleEntries, type HubTabViews, type ShellLink } from '@/extensions/slots';
import { hubTabs } from '@/extensions/generated-hub-tabs';
import { shellLinks } from '@/extensions/generated-shell-links';
import { CollaborationHubChromeProvider, CollaborationHubFrame } from './collaboration-hub-frame';
import { parseCollaborationTab } from './collaboration-tabs';

/**
 * 협업 허브 셸(core, 허브 분해 H1). 탭은 기능의 hub-tabs 기여(쪽지·스크랩)이고, 머리 링크는 shell-links 의 collaboration-hub
 * 배치(주소록 관리·메일 발송)다. 셸은 기능 코드를 import 하지 않는다 — 기능이 빠진 구성에서는 그 기여 파일이 함께 지워지고
 * 레지스트리가 남은 기여로 다시 만들어진다. 탭이 하나도 없는 구성(core 등)에는 정직한 빈 상태를 그린다. 탭 기여는 있는데 권한으로
 * 모두 가려졌으면(H5 — 탭은 그 목록 API 권한으로 보인다) 구성이 아니라 권한 때문이라고 말한다.
 */

/**
 * 이 라우트가 URL 에 싣는 쿼리 키 전수. 탭 하나만 읽는다.
 *
 * 종전에는 들어온 쿼리를 통째로 복사해 재발행했다 — 모르는 이름이 한 번 들어오면 이동마다
 * 다시 붙는 캐리어였다(DEC-OPS-029 Q2). 새 파라미터를 도입하면 이 목록에 함께 넣어야 하고,
 * 빠뜨리면 이동 시 조용히 사라진다.
 */
const HUB_PARAM_KEYS = ['tab'] as const;

const isCollaborationTab = isHubTab('collaboration');
const isHubLink = (link: ShellLink) => link.placement === 'collaboration-hub';

/** 열린 탭의 뷰. 탭을 바꾸면 key 가 바뀌어 뷰가 다시 마운트된다 — 검색어 같은 탭 상태가 비워진다. */
function ActiveCollaborationTab({ view: { Component } }: { view: HubTabViews['collaboration'] }) {
  return <Component />;
}

export default function CollaborationHubClient({ defaultTab = 'MESSAGES' }: { defaultTab?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const auth = useOptionalAuth();
  const user = auth?.user;
  // 권한 상태를 아직 모르면(서버가 사용자를 넘기지 못해 다시 확인하는 동안) 권한으로 가린 탭이 아직 없다. 그때 빈 상태를 말하지 않는다.
  const permissionPending = auth?.loading === true;

  const tabs = useMemo(() => visibleEntries(user, hubTabs, isCollaborationTab), [user]);
  // 이 구성에 협업 탭 기여가 있는가(권한과 무관). 있는데 보이는 탭이 없으면 권한 때문이다.
  const contributed = hubTabs.some((entries) => entries.some(isCollaborationTab));
  const links = useMemo(() => visibleEntries(user, shellLinks, isHubLink), [user]);

  // [P1-7] 탭은 URL 파생값이다. 공유·새로고침·뒤로가기가 그대로 복원된다. 이 구성에 없는 탭이면 페이지 기본 탭, 그것도 없으면 첫 탭이다.
  const tabIds = tabs.map((tab) => tab.id);
  const activeId = parseCollaborationTab(searchParams.get('tab'), tabIds)
    ?? parseCollaborationTab(defaultTab, tabIds)
    ?? tabIds[0]
    ?? null;
  const active = tabs.find((tab) => tab.id === activeId);

  const handleTabChange = useCallback((tab: string) => {
    const params = pickAllowedParams(searchParams, HUB_PARAM_KEYS);
    params.set('tab', tab);
    // ADR-0009는 URL 사용을 의무화하지 않는다. 탭 뷰는 검색어를 로컬 상태로 유지한다.
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const tabList = tabs.length > 0 ? (
    <div role="tablist" aria-label="협업 데이터 구분" className="flex rounded-md border border-border p-0.5">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          id={`collab-tab-${tab.id}`}
          aria-selected={activeId === tab.id}
          aria-controls="collab-tabpanel"
          onClick={() => handleTabChange(tab.id)}
          className={cn(
            'flex h-[var(--control-h-sm)] items-center rounded px-4 text-xs font-bold transition-colors',
            activeId === tab.id ? 'bg-muted text-primary' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  ) : null;

  const hubLinks = links.map(({ id, href, label, icon: Icon }) => (
    <Button key={id} asChild variant="outline" size="sm">
      <Link href={href}>
        {Icon ? <Icon size={16} aria-hidden="true" /> : null}
        {label}
      </Link>
    </Button>
  ));

  return (
    <CollaborationHubChromeProvider value={{ tabList, hubLinks, activeTabId: active?.id ?? null }}>
      {active ? (
        <ActiveCollaborationTab key={active.id} view={active.view} />
      ) : (
        <CollaborationHubFrame description="구성에 포함된 협업 기능의 목록을 탭으로 모아 봅니다.">
          {permissionPending ? (
            <div aria-busy="true" className="py-10" />
          ) : (
            <p role="status" className="py-10 text-center text-[length:var(--font-size-body)] text-muted-foreground">
              {contributed
                ? '협업 목록 조회 권한이 없습니다. 필요하면 시스템 관리자에게 문의해 주세요.'
                : '이 구성에서 볼 수 있는 협업 목록이 없습니다.'}
            </p>
          )}
        </CollaborationHubFrame>
      )}
    </CollaborationHubChromeProvider>
  );
}
