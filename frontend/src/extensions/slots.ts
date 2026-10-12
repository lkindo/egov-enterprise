/**
 * 확장 슬롯 — 기능이 core 셸에 값을 기여하는 자리(슬롯 단계 PR-4·PR-6, 스크랩 슬롯).
 *
 * pack 마커 블록은 셸 파일 안에 선택 기능의 코드를 품어, 기능이 빠지면 투영이 그 줄을 걷어 냈다. 슬롯은 반대로 기능이 자기
 * 디렉터리(src/extensions/<기능 id>/<슬롯>.ts)에 항목을 적고, 셸은 생성 레지스트리(src/extensions/generated-<슬롯>.ts)만 읽는다.
 * 기능이 빠지면 기여 파일이 기능과 함께 직접 지워지고 레지스트리가 남은 기여로 다시 만들어진다 — 셸은 바뀌지 않는다.
 *
 * 이 파일은 core 소유다. 기능 디렉터리를 import 하지 않는다. 슬롯 이름 하나를 모든 곳에 같은 철자로 쓴다:
 * SlotMap 키 = 기여 파일 이름 = 레지스트리 파일 이름(generated-<이름>.ts). 키를 더할 때는 그 슬롯을 읽는 셸(소비자)을 같은 변경에 둔다.
 */
import type { ComponentType } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react';
import { canPermission } from '@/lib/auth/permissions';
import { canOpenPage } from '@/lib/auth/page-access';
import type { PermissionCode } from '@/types/generated-permissions';
import type { RecipientAddressBookSource } from '@/types/recipient-address-book';

/**
 * 노출 술어(데이터). 라우트 게이트·기능권한과 같은 함수로 판정한다. 노출일 뿐 인가가 아니다 — 서버 권한은 그대로 집행된다(H3).
 * - always: 판정하지 않는다. 왜 늘 보이는지 사유 문장을 적는다(빈 문자열은 경계 계약이 거부한다).
 * - permissions: 적은 기능권한을 모두 가진 사람에게 보인다.
 * - page: 그 화면에 들어갈 수 있는 사람에게 보인다. /admin 밖 경로는 페이지 게이트가 없어 늘 참이다 — 그때 실제 보장은 기여 파일이
 *   기능과 함께 직접 지워지는 것이다.
 */
export type SlotVisibility =
  | { readonly always: string }
  | { readonly permissions: readonly [PermissionCode, ...PermissionCode[]] }
  | { readonly page: string };

/** 모든 슬롯 항목의 공통 모양. visibleWhen 이 없으면 타입 검사가 거부한다. */
export interface SlotEntry {
  /** 슬롯 안에서 유일한 식별자. */
  readonly id: string;
  readonly visibleWhen: SlotVisibility;
}

/** recipient-picker-sources — 수신자 피커의 명함 출처. 알림 채널은 계정으로 전달되므로 받지 않는다. */
export interface RecipientPickerSource extends SlotEntry {
  /** 탭과 입력 안내에 쓰는 출처 이름. */
  readonly label: string;
  readonly channels: readonly ('mail' | 'sms')[];
  readonly source: RecipientAddressBookSource;
}

/**
 * shell-links — 앱 셸의 링크. 배치는 소비 셸이 있는 것만 닫힌 목록으로 둔다(머리글·바닥글·오류 화면·명령 센터·협업 허브 머리).
 * 셸이 모양을 정하고 항목은 목적지·이름·아이콘만 준다. visibleWhen 은 { page: 자기 href } 여야 한다. 주체 없이 거르는 바닥글·오류 화면
 * 배치는 /admin 밖 목적지만 둔다. 머리글·명령 센터 배치는 아이콘이 있는 목록이라 icon 이 필요하다. 바닥글 항목은 같은 기여 안에 같은
 * 목적지의 머리글 짝을 둔다(경계 계약).
 */
export interface ShellLink extends SlotEntry {
  readonly placement: 'header' | 'footer' | 'error' | 'command-center' | 'collaboration-hub';
  /** 같은 배치 안의 순서(작은 값 먼저). */
  readonly order: number;
  readonly href: string;
  readonly label: string;
  readonly icon?: LucideIcon;
  /** 오류 화면에서 링크 위에 보이는 안내 문장. 명령 센터에서는 항목 아래 설명이다. */
  readonly description?: string;
}

/** header-widgets — 머리글 테마 전환 뒤의 컴포넌트. 컴포넌트는 기능 디렉터리에 두고 기여는 참조만 한다(JSX 금지). */
export interface HeaderWidget extends SlotEntry {
  readonly order: number;
  readonly Component: ComponentType;
}

/** post-actions 가 받는 게시글 맥락. 호스트(게시글 상세)가 만든다 — nttId 별칭은 호스트가 pstSn 으로 정규화해 넘긴다. */
export interface PostActionContext {
  readonly bbsId: string;
  readonly pstSn: number;
  /** 게시글 제목(없으면 빈 문자열). */
  readonly title: string;
  /** 게시판 이름(없으면 빈 문자열). */
  readonly boardTitle: string;
  /** 게시글 상세의 정본 경로. 기여 쪽이 화면 경로 리터럴을 갖지 않게 호스트가 만든다. */
  readonly canonicalPath: string;
  readonly queryClient: QueryClient;
}

/**
 * post-actions — 게시글 상세의 부가 동작 버튼(추천과 삭제 사이). 잠금(추천·삭제·해결 표시와 하나)·토스트·완료 표시는 호스트가
 * 소유하고, 항목은 쓰기 함수 하나(submit)만 준다. submit 은 폼 검증 census 가 쓰기로 읽는 이름이다 — 다른 이름으로 바꾸지 않는다.
 * 쓰기 함수는 기능 소유의 조회 옵션 모듈(src/queries)에 두고 기여는 그 이름만 가리킨다(기여는 데이터다).
 */
export interface PostAction extends SlotEntry {
  /** 같은 슬롯 안의 순서(작은 값 먼저). */
  readonly order: number;
  /** 버튼 글자. */
  readonly label: string;
  /** 완료 뒤 버튼 글자. */
  readonly doneLabel: string;
  /** 접근 이름 — 기본·진행 중·완료. */
  readonly name: string;
  readonly busyName: string;
  readonly doneName: string;
  readonly icon: LucideIcon;
  readonly successMessage: string;
  /** 서버 사유가 없을 때 쓰는 실패 문구. */
  readonly failureMessage: string;
  /** 서버에 유일성 제약이 없어 이번 방문에서 한 번만 누르게 잠근다(새로고침하면 풀린다). */
  readonly oncePerVisit: boolean;
  readonly submit: (context: PostActionContext) => Promise<void>;
}

/**
 * hub-tabs 의 허브별 탭 뷰. 허브마다 탭이 하는 일이 달라 뷰 모양을 허브별로 둔다 — 허브를 더할 때는 키 하나를 더한다.
 * 뷰는 기능 모듈이 내보낸 값이고 기여는 그 이름(또는 이름만 담은 객체)만 가리킨다(기여는 데이터다).
 */
export interface HubTabViews {
  /** 협업 허브(core 셸). 탭 뷰가 자기 목록 조회·표·대화상자를 소유하고 core 틀(collaboration-hub-frame)에 조각을 넘긴다. */
  readonly collaboration: { readonly Component: ComponentType };
  /**
   * 지식 허브(게시판 셸, 허브 분해 H2). 셸이 그 게시판(bbsId)의 글 목록·인기·최근 활동을 그리고, 탭이 열렸을 때 기여의 머리 동작(Actions)을
   * 더한다. 설명은 탭 버튼 아래 짧은 문구다.
   */
  readonly knowledge: {
    readonly description: string;
    readonly icon: LucideIcon;
    readonly bbsId: string;
    readonly Actions?: ComponentType;
  };
}
export type HubId = keyof HubTabViews;

/**
 * hub-tabs — 허브 셸의 탭. id 는 그 탭의 `?tab=` 값(대문자 식별자)이고 슬롯 전체에서 유일하다. 그 허브의 코어 탭과 겹치지 않고,
 * 허브의 탭 해석 모듈(`*-tabs.ts` 의 TAB_HUB.contributable)이 이 기여 파일을 지목해야 한다(경계 계약). 셸은 자기 허브의 항목만
 * 고른다(isHubTab) — 쓰기 귀속(축 3·화면 목록)도 허브별 소비자 표를 따른다.
 */
export type HubTab = {
  [H in HubId]: SlotEntry & {
    readonly hub: H;
    /** 같은 허브 안의 순서(작은 값 먼저). */
    readonly order: number;
    /** 탭 버튼 글자. */
    readonly label: string;
    readonly view: HubTabViews[H];
  };
}[HubId];

/** 셸이 자기 허브의 항목만 고르는 술어(타입을 좁힌다). */
export const isHubTab = <H extends HubId>(hub: H) =>
  (entry: HubTab): entry is Extract<HubTab, { readonly hub: H }> => entry.hub === hub;

export interface SlotMap {
  'hub-tabs': HubTab;
  'recipient-picker-sources': RecipientPickerSource;
  'shell-links': ShellLink;
  'header-widgets': HeaderWidget;
  'post-actions': PostAction;
}
export type SlotId = keyof SlotMap;
/** 한 기능이 한 슬롯에 기여하는 항목들. 레지스트리는 이것을 기능(owner) 코드 포인트 순으로 모은 배열이다. */
export type SlotContributions<S extends SlotId> = readonly SlotMap[S][];

/** 기여 파일의 유일한 default export 를 만든다. slot 은 파일 이름과 같아야 한다(경계 계약). owner 는 디렉터리다. */
export function defineContributions<S extends SlotId>(slot: S, entries: SlotContributions<S>): SlotContributions<S> {
  void slot;
  return entries;
}

type SlotSubject = Parameters<typeof canPermission>[0];

/** 술어 하나를 판정한다. 권한 상태를 모르는 주체(null·버전 없음)에게는 permissions·/admin 의 page 술어가 거짓이다. */
export function isContributionVisible(subject: SlotSubject, rule: SlotVisibility): boolean {
  if ('always' in rule) return true;
  if ('permissions' in rule) return rule.permissions.every((code) => canPermission(subject, code));
  return canOpenPage(subject, rule.page);
}

const byCodePoint = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);
const orderOf = (entry: SlotEntry): number | undefined => {
  const order = (entry as { readonly order?: unknown }).order;
  return typeof order === 'number' ? order : undefined;
};

/**
 * 레지스트리를 펼쳐 보이는 항목만 돌려준다. 순서: order(있는 항목이 앞, 작은 값 먼저) → 레지스트리 순서(owner 코드 포인트) → id.
 * 훅이 아니므로 서버 컴포넌트도 쓴다. 항목 객체는 기여 모듈의 값 그대로다(새로 만들지 않는다).
 */
export function visibleEntries<S extends SlotId, T extends SlotMap[S]>(
  subject: SlotSubject,
  registry: readonly SlotContributions<S>[],
  accept: (entry: SlotMap[S]) => entry is T,
): T[];
export function visibleEntries<S extends SlotId>(
  subject: SlotSubject,
  registry: readonly SlotContributions<S>[],
  accept?: (entry: SlotMap[S]) => boolean,
): SlotMap[S][];
export function visibleEntries<S extends SlotId>(
  subject: SlotSubject,
  registry: readonly SlotContributions<S>[],
  accept: (entry: SlotMap[S]) => boolean = () => true,
): SlotMap[S][] {
  return registry
    .flatMap((entries, owner) => entries.map((entry) => ({ entry, owner })))
    .filter(({ entry }) => accept(entry) && isContributionVisible(subject, entry.visibleWhen))
    .sort((left, right) => {
      const [a, b] = [orderOf(left.entry), orderOf(right.entry)];
      if (a !== b) return a === undefined ? 1 : b === undefined ? -1 : a - b;
      return left.owner - right.owner || byCodePoint(left.entry.id, right.entry.id);
    })
    .map(({ entry }) => entry);
}
