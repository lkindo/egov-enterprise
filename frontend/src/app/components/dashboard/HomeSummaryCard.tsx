import Link from 'next/link';

/**
 * 업무 홈 요약 카드 한 장(core). 요약 카드 줄(home-sections 의 cards 배치)의 `<li>` 하나를 그린다 — 이름·값은 목적지로 가는 링크이고,
 * 아래에 최근 항목 몇 건과 범위 안내를 덧붙일 수 있다. 기능의 홈 조각(일정·메모 보고·설문)과 core 셸의 부서 업무 카드가 함께 쓴다.
 *
 * 값은 호출한 쪽이 정한다: 조회 중 '확인 중', 실패 '조회 실패', 셌으면 'n건' — 셀 수 없는 값을 0건으로 말하지 않는다(unknownAsZero).
 * 항목 글자는 링크가 아니다(목적지는 카드 링크 하나다) — 링크 이름을 '이름 + 값' 으로 짧게 둔다.
 */
export interface HomeSummaryCardProps {
  readonly href: string;
  readonly label: string;
  readonly value: string;
  /** 최근 항목(제목). 비면 그리지 않는다. */
  readonly items?: readonly string[];
  /** 값의 범위 안내 한 줄(예: 최근 100건만 확인했다). */
  readonly note?: string;
}

export function HomeSummaryCard({ href, label, value, items = [], note }: HomeSummaryCardProps) {
  return (
    <li className="rounded-md border border-border bg-card px-4 py-3">
      <Link href={href} className="group block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <span className="text-[length:var(--font-size-body)] text-muted-foreground group-hover:text-primary">{label}</span>
        <span className="mt-1 block text-2xl font-bold tabular-nums text-foreground">{value}</span>
      </Link>
      {items.length > 0 && (
        <ul aria-label={`${label} 최근 항목`} className="mt-2 space-y-1">
          {items.map((item, index) => (
            <li key={`${index}-${item}`} className="truncate text-xs text-muted-foreground" title={item}>{item}</li>
          ))}
        </ul>
      )}
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
    </li>
  );
}

/** 조회 상태 → 카드 값. 셀 수 없으면 0건이 아니라 '조회 실패' 다. */
export function summaryValue(query: { readonly isPending: boolean; readonly isError: boolean }, count: number | null | undefined): string {
  if (query.isPending) return '확인 중';
  if (query.isError || typeof count !== 'number') return '조회 실패';
  return `${count}건`;
}
