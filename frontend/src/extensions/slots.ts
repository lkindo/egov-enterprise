/**
 * 확장 슬롯 — 기능이 core 셸에 값을 기여하는 자리(슬롯 단계 PR-4).
 *
 * pack 마커 블록은 셸 파일 안에 선택 기능의 코드를 품어, 기능이 빠지면 투영이 그 줄을 걷어 냈다. 슬롯은 반대로 기능이 자기
 * 디렉터리(src/extensions/<기능 id>/<슬롯>.ts)에 항목을 적고, 셸은 생성 레지스트리(src/extensions/generated-<슬롯>.ts)만 읽는다.
 * 기능이 빠지면 기여 파일이 기능과 함께 직접 지워지고 레지스트리가 남은 기여로 다시 만들어진다 — 셸은 바뀌지 않는다.
 *
 * 이 파일은 core 소유다. 기능 디렉터리를 import 하지 않는다. 슬롯 이름 하나를 모든 곳에 같은 철자로 쓴다:
 * SlotMap 키 = 기여 파일 이름 = 레지스트리 파일 이름(generated-<이름>.ts). 키를 더할 때는 그 슬롯을 읽는 셸(소비자)을 같은 변경에 둔다.
 */
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

export interface SlotMap {
  'recipient-picker-sources': RecipientPickerSource;
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
