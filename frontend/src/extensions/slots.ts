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
import type { ComponentType, ReactNode } from 'react';
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
 * shell-links — 앱 셸의 링크. 배치는 소비 셸이 있는 것만 닫힌 목록으로 둔다(머리글·바닥글·오류 화면·명령 센터·협업 허브 머리·
 * 나의 업무 탭 줄·업무 보고 머리).
 * 셸이 모양을 정하고 항목은 목적지·이름·아이콘만 준다. visibleWhen 은 { page: 자기 href } 여야 한다. 주체 없이 거르는 바닥글·오류 화면
 * 배치는 /admin 밖 목적지만 둔다. 머리글·명령 센터·업무 보고 머리 배치는 아이콘이 있는 목록이라 icon 이 필요하다. 바닥글 항목은 같은
 * 기여 안에 같은 목적지의 머리글 짝을 둔다(경계 계약).
 * - work-hub(업무 허브 분해 W1): 나의 업무 탭 줄의 탭 하나. 탭은 글자뿐이라 icon 을 두지 않는다. id 가 탭 DOM id(work-hub-tab-<id>)
 *   가 되므로 core 탭(업무 관리, id job·목적지 /smart-toolkit/dept-job)과 겹치지 않는다. 탭은 그 화면 경로로 가는 경로 탭이다.
 * - work-report(업무 허브 분해 W1): 업무 보고 화면 머리의 링크. description 은 업무 보고 화면 설명에 덧붙는 한 문장이고 링크와 함께
 *   보이고 숨는다(갈 수 없는 화면을 안내하지 않는다).
 */
export interface ShellLink extends SlotEntry {
  readonly placement: 'header' | 'footer' | 'error' | 'command-center' | 'collaboration-hub' | 'work-hub' | 'work-report';
  /** 같은 배치 안의 순서(작은 값 먼저). */
  readonly order: number;
  readonly href: string;
  readonly label: string;
  readonly icon?: LucideIcon;
  /** 오류 화면에서 링크 위에 보이는 안내 문장. 명령 센터에서는 항목 아래 설명, 업무 보고 머리에서는 화면 설명에 덧붙는 문장이다. */
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
  /** 성공하면 이번 방문에서 다시 누르지 못하게 잠근다(새로고침하면 풀린다). 서버가 거부할 두 번째 요청을 보내지 않으려는 것이다. */
  readonly oncePerVisit: boolean;
  readonly submit: (context: PostActionContext) => Promise<void>;
}

/**
 * 허브 탭(hub-tabs-<허브>)의 허브별 탭 뷰. 허브마다 탭이 하는 일이 달라 뷰 모양을 허브별로 둔다 — 허브를 더할 때는 키 하나와
 * SlotMap 의 슬롯 하나(`'hub-tabs-<허브>': HubTab<'<허브>'>`)를 같은 변경에서 더한다(경계 계약이 둘을 대조한다).
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
  /**
   * 감시 허브(core 셸, 허브 분해 H3). 로그 목록·가동 상태 밖의 부가 탭이다. 뷰가 본문·선택 전 개요·선택 항목 찾기·상세를 한 묶음으로
   * 내놓고, 셸이 탭 버튼(아이콘)·제목 아래 설명·상세 틀을 그린다. sample 이면 상세에 샘플 고지를 단다 — 정적 카탈로그나 표본이라
   * 실측이 아니라는 표시이고, 실제 기록을 보이는 탭은 sample 을 두지 않는다.
   */
  readonly monitoring: {
    readonly description: string;
    readonly icon: LucideIcon;
    readonly sample?: boolean;
    readonly render: (props: { selectedItemId: string | number | null; onSelect: (id: string) => void }) => ReactNode;
    readonly overview: () => ReactNode;
    readonly find: (id: string) => object | null;
    readonly detail: (item: unknown) => { title: string; view: ReactNode } | null;
  };
}
export type HubId = keyof HubTabViews;

/**
 * hub-tabs-<허브> — 허브 셸의 탭(GAP-SLOT-001). 허브마다 슬롯과 레지스트리가 따로라 허브 셸은 자기 허브의 레지스트리 하나만 읽고,
 * 다른 허브의 탭 뷰를 번들에 싣지 않는다. 허브는 슬롯 이름이 정하므로 항목에 hub 를 적지 않는다. id 는 그 탭의 `?tab=` 값(대문자
 * 식별자)이고 그 허브 슬롯 안에서 유일하다. 그 허브의 코어 탭과 겹치지 않고, 허브의 탭 해석 모듈(`*-tabs.ts` 의 TAB_HUB.contributable)이
 * 이 기여 파일을 지목해야 한다(경계 계약). 쓰기 귀속(축 3·화면 목록)은 그 허브 레지스트리를 읽는 셸로 이어진다.
 */
export interface HubTab<H extends HubId> extends SlotEntry {
  /** 같은 허브 안의 순서(작은 값 먼저). */
  readonly order: number;
  /** 탭 버튼 글자. */
  readonly label: string;
  readonly view: HubTabViews[H];
}

/** 통계 셸이 고른 집계 기간. 고르지 않으면 undefined 이고 서버 기본값(최근 1개월)을 집계한다. */
export interface StatsDateRange {
  readonly fromDate: string;
  readonly toDate: string;
}

/** 일자별 집계 한 칸. 서버가 채우는 값은 일자와 건수 둘뿐이다(StatsAdminService). */
export interface StatsSeriesPoint {
  readonly statsDate?: string;
  readonly statsCo?: number;
}

/** 통계 셸이 패널 조회로 만들어 본문 탭에 넘기는 결과. 조회는 셸이 소유한다 — 기여는 훅을 넘길 수 없다(기여는 데이터다). */
export interface StatsPanelQuery {
  readonly data: unknown;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly isFetching: boolean;
  readonly refetch: () => Promise<unknown>;
}

interface StatsHubTabBase extends SlotEntry {
  readonly placement: 'hub-tab';
  /** 통계 내비게이션의 자리(작은 값 먼저). 셸 탭: 통계 개요 10 · 사용자 통계 20 · 시스템 활성 40 (운영 보고서 70 은 2026-10-19 걷었다). */
  readonly order: number;
  /** 내비게이션 단추 글자. */
  readonly label: string;
  /** 화면 제목(h1)과 본문 카드 제목. */
  readonly title: string;
  readonly icon: LucideIcon;
  /** 조회 키 접두. series 는 셸이 집계 기간을 덧붙인다. */
  readonly queryKey: readonly string[];
}

/**
 * series — 일자별 집계를 셸의 면적 차트·내보내기로 그린다. 탭이 곧 라우트라 href 를 가진다(링크 슬롯: visibleWhen 은 { page: href }).
 * 미수집 축(쓰는 쪽이 없는 집계)은 uninstrumented 이고, 빈 차트는 기간이 아니라 미수집을 말한다. 요약 칸(summary)은 미수집 축에만
 * 둔다 — 값은 늘 '미수집' 이다(측정되지 않는 값을 0 으로 보이지 않는다).
 */
export type StatsSeriesTab = StatsHubTabBase & {
  readonly kind: 'series';
  readonly href: string;
  readonly load: (range?: StatsDateRange) => Promise<readonly StatsSeriesPoint[]>;
} & (
  | { readonly uninstrumented: false }
  | { readonly uninstrumented: true; readonly summary?: { readonly label: string; readonly icon: LucideIcon } }
);

/** body — 기능이 본문을 그리는 탭. 전용 라우트가 없어 현재 경로의 `?tab=<id>` 로 연다. 내보내기 행도 기능이 만든다. */
export interface StatsBodyTab extends StatsHubTabBase {
  readonly kind: 'body';
  readonly load: () => Promise<unknown>;
  readonly Body: ComponentType<{ readonly query: StatsPanelQuery }>;
  readonly exportRows: (data: unknown) => Record<string, unknown>[];
  readonly exportHeaders: readonly { readonly label: string; readonly key: string }[];
}

/** overview-card — 통계 요약(/admin/stats)의 칸. 값은 요약 API 응답의 닫힌 필드다. */
export interface StatsOverviewCard extends SlotEntry {
  readonly placement: 'overview-card';
  readonly order: number;
  readonly title: string;
  readonly field: 'totalPosts';
}

/**
 * stats-panels — 통계 셸의 기능 탭과 요약 칸(허브 분해 H4). 셸이 패널 조회를 한 번(useQueries)에 소유하고, 기여는 조회 키·로더·본문
 * 컴포넌트·내보내기 함수를 이름으로만 가리킨다. 기능이 빠진 구성에서는 기여 파일이 함께 지워져 그 탭·칸만 사라진다.
 */
export type StatsPanel = StatsSeriesTab | StatsBodyTab | StatsOverviewCard;
export type StatsHubTab = StatsSeriesTab | StatsBodyTab;
export const isStatsHubTab = (entry: StatsPanel): entry is StatsHubTab => entry.placement === 'hub-tab';
export const isStatsOverviewCard = (entry: StatsPanel): entry is StatsOverviewCard => entry.placement === 'overview-card';

/**
 * 업무 홈 미리 채우기 하나(Phase 2 9단계). query 는 기능 소유의 queryOptions 값이고 'use client' 가 없는 모듈에서 가져온다 —
 * 서버 자식이 실제 객체를 받아야 한다('use client' 모듈의 값은 서버에서 클라이언트 참조가 된다, 경계 계약). failure 는 서버에서 실패했을
 * 때의 뜻이다.
 * - boundary: 다시 던져 서버에서 라우트 오류 경계로 보낸다(실패를 빈 화면이나 0건으로 위장하지 않는다).
 * - section: 삼키고 그 구역이 스스로 '조회 실패' 를 말한다(브라우저가 다시 읽는다).
 */
export interface HomePrefetch {
  /**
   * 기능 소유 queryOptions 값. 셸은 키와 조회 함수만 쓰므로 그 둘로만 받는다 — 조회마다 데이터 타입이 달라 공통 FetchQueryOptions 로는
   * 받을 수 없다(키 튜플 타입이 함수 매개변수 자리에서 반공변이다). queryFn 을 메서드 꼴로 적어 그 비교를 이변으로 둔다.
   */
  readonly query: { readonly queryKey: readonly unknown[]; queryFn?(context: never): unknown };
  readonly failure: 'boundary' | 'section';
}

/**
 * home-sections — 업무 홈('/')의 자리(Phase 2 9단계). 셸이 배치마다 순서대로 그린다: overlay(구역 밖에 뜨는 것) → 머리의 actions
 * (단추) → cards(요약 카드 줄, Component 는 <li> 하나를 그린다 — core 셸의 카드와 같은 order 축) → main(본문 목록) → status(상태 구역)
 * → bottom(홍보). 2026-10-20 늘 비어 있던 활동 구역과 그 구역에 덧붙이던 activityNote 를 걷었다.
 * Component 는 기능의 'use client' 모듈에서 가져오고 기여는 그 이름만 가리킨다 — 서버 자식도 레지스트리를 읽으므로 서버에서 그릴 수 없는
 * 컴포넌트(ssr:false 래퍼)가 서버 그래프에 들어오지 않게 한다(경계 계약). 링크는 컴포넌트가 그린다(기여는 링크 키를 갖지 않는다).
 * 셸은 등록된 항목이 하나라도 있으면 DASHBOARD_READ 로 홈 진입을 판정한다(app/home-access.ts).
 */
export interface HomeSection extends SlotEntry {
  readonly placement: 'overlay' | 'actions' | 'cards' | 'main' | 'status' | 'bottom';
  /** 같은 배치 안의 순서(작은 값 먼저). */
  readonly order: number;
  readonly Component: ComponentType;
  /** 서버가 첫 화면 전에 채워 둘 조회. 같은 키는 한 번만 부른다. */
  readonly prefetch?: readonly HomePrefetch[];
}

/** notification-actions 가 받는 알림 맥락. 호스트(머리글 알림 드로어)가 만든다. */
export interface NotificationActionContext {
  readonly notificationId: number;
  /** 알림 제목(없으면 빈 문자열). */
  readonly title: string;
  /** 항목의 match 가 그 알림의 이동 경로에서 읽은 대상(예: 결재 문서 번호). */
  readonly target: string;
  readonly queryClient: QueryClient;
}

/**
 * 대기 처리가 끝난 모습. 실제로 보냈으면 done(알릴 문장), 보내기 전에 되돌렸으면 undone 이다 — 되돌린 곳이 호스트가 아니어도
 * (결재함의 '처리 예정' 처럼 같은 대기열을 나눠 쓰는 다른 화면) undone 으로 끝난다.
 */
export type NotificationActionSettlement =
  | { readonly kind: 'done'; readonly message: string }
  | { readonly kind: 'undone' };

/**
 * notification-actions 의 submit 이 돌려주는 결과. 일정 시간 뒤에 보내는 처리(되돌리기 창)면 undo·undoMs·settled 를 함께 준다 —
 * 호스트가 되돌리기 단추를 그 시간 동안 두고, settled 가 끝나면 결과를 알린다. 어디서 되돌렸든 settled 는 undone 으로 끝난다.
 */
export interface NotificationActionOutcome {
  /** 누른 직후 알릴 문장(예: 10초 뒤 처리합니다). */
  readonly message: string;
  /** 아직 보내지 않았으면 취소하고 true. 이미 보냈으면 false. */
  readonly undo?: () => boolean;
  /** 되돌릴 수 있는 시간(ms). */
  readonly undoMs?: number;
  /** 되돌렸을 때 알릴 문장. 없으면 호스트가 '처리를 되돌렸습니다.' 라고 한다. */
  readonly undoneMessage?: string;
  /** 실제로 보냈으면 알릴 문장으로, 보내기 전에 되돌렸으면 undone 으로 끝나고, 보낸 처리가 실패하면 그 오류로 거절된다. */
  readonly settled?: Promise<NotificationActionSettlement>;
}

/**
 * notification-actions — 머리글 알림 드로어의 알림 카드에 붙는 바로 처리 단추(결재 차례 알림의 [승인] 등). 호스트(알림 드로어)가
 * 잠금·상태 문구·토스트·되돌리기 단추·[열기] 링크를 소유하고, 항목은 알림을 고르는 함수(match)와 쓰기 함수(submit)만 준다.
 * 두 함수는 기능 소유 모듈(src/queries 등)에 두고 기여는 그 이름만 가리킨다(기여는 데이터다). submit 은 폼 검증 census 가 쓰기로
 * 읽는 이름이다 — 다른 이름으로 바꾸지 않는다. 판정(차례인가·버전)은 submit 이 서버에서 다시 읽어 한다 — 알림은 지난 사실이다.
 */
export interface NotificationAction extends SlotEntry {
  /** 같은 슬롯 안의 순서(작은 값 먼저). */
  readonly order: number;
  /** 단추 글자와 진행 중 글자. */
  readonly label: string;
  readonly busyLabel: string;
  /** 접근 이름 접두 — 호스트가 `${name}: ${알림 제목}` 으로 붙인다. */
  readonly name: string;
  /** 서버 사유가 없을 때 쓰는 실패 문구. */
  readonly failureMessage: string;
  /** 이 알림에 이 단추를 둘지. 내부 이동 경로에서 대상을 읽으면 그 값을, 아니면 null. */
  readonly match: (linkUrl: string) => string | null;
  readonly submit: (context: NotificationActionContext) => Promise<NotificationActionOutcome>;
}

/**
 * delivery-channels — 이 구성에 있는 전달 채널(GAP-COMPOSE-001). 채널 기능이 항목 하나를 기여하고, 화면은 core 도우미
 * (lib/delivery-channels.ts 의 hasDeliveryChannel)로 그 채널이 있는지만 묻는다. 채널 기능이 빠진 구성에서는 기여가 함께 지워져
 * 레지스트리가 비고, 화면은 그 채널로 보낸다고 말하거나 보내는 컨트롤을 두지 않는다. 구성의 사실이라 보는 사람마다 다르지 않다 —
 * 노출 술어는 always 하나다.
 */
export interface DeliveryChannel extends SlotEntry {
  readonly id: 'notification';
  readonly visibleWhen: { readonly always: string };
}

export interface SlotMap {
  'delivery-channels': DeliveryChannel;
  'hub-tabs-collaboration': HubTab<'collaboration'>;
  'hub-tabs-knowledge': HubTab<'knowledge'>;
  'hub-tabs-monitoring': HubTab<'monitoring'>;
  'stats-panels': StatsPanel;
  'recipient-picker-sources': RecipientPickerSource;
  'shell-links': ShellLink;
  'header-widgets': HeaderWidget;
  'post-actions': PostAction;
  'home-sections': HomeSection;
  'notification-actions': NotificationAction;
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
