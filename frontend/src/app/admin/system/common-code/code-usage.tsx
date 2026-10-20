/**
 * 공통코드 그룹의 사용처(2026-10-20).
 *
 * 서버가 그룹 목록·상세에 싣는 `usages` 는 이 제품이 그 그룹을 읽는 곳이다 — 기능마다 그 그룹을 읽는 코드 옆에서 기여하고
 * (CommonCodeUsageContributor), 기능 선언(config/modules 의 owns.commonCodeGroups)과 같은 집합인지 운영 계약이 대조한다.
 * 그래서 일부 기능만 고른 생성물에서는 그 구성의 기능이 읽는 그룹만 '읽음'으로 나온다. 화면은 이 값만 읽고 그룹 이름을
 * 하나도 들고 있지 않다.
 *
 * 빈 목록은 '이 제품의 코드가 읽지 않는다'는 뜻이다. 다른 시스템이 이 값을 쓰는지는 이 화면이 알 수 없으므로 그렇게 말한다.
 */
import { useId } from 'react';
import type { CmmnCode } from '@/types/foundation/system';

/** 확인 대화상자의 사용처 목록 상자 이름. */
export const CODE_USAGE_DETAILS_LABEL = '이 제품이 이 그룹을 읽는 곳';

/** 이 그룹을 읽는 곳. 서버가 싣지 않았거나 읽지 않는 그룹이면 빈 목록이다. */
export function codeUsagesOf(group: Pick<CmmnCode, 'usages'> | null | undefined): string[] {
  return group?.usages ?? [];
}

/** 그룹 표시 이름 — `‘이름’(ID)`. 이름이 없으면 ID 만 쓴다. */
export function codeGroupLabel(group: Pick<CmmnCode, 'cdId' | 'cdIdNm'>): string {
  return group.cdIdNm ? `‘${group.cdIdNm}’(${group.cdId})` : group.cdId;
}

/** 사용처 문장 목록. 확인 대화상자의 details 와 상세 패널이 같은 모양을 쓴다. */
export function CodeUsageList({ usages }: { usages: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-foreground">
      {usages.map((usage) => <li key={usage}>{usage}</li>)}
    </ul>
  );
}

/** 상세 패널의 사용처 안내. 읽는 그룹이면 사용처를, 읽지 않는 그룹이면 그 사실과 한계를 말한다. */
export function CodeUsagePanel({ usages, headingLevel }: { usages: string[]; headingLevel: 'h3' | 'h4' }) {
  const Heading = headingLevel;
  const headingId = useId();
  if (usages.length > 0) {
    return (
      <section aria-labelledby={headingId} data-code-usage="read" className="space-y-2 rounded-md border border-border bg-card p-3">
        <Heading id={headingId} className="text-sm font-semibold text-foreground">이 제품이 읽는 그룹</Heading>
        <CodeUsageList usages={usages} />
        <p className="text-xs text-muted-foreground">
          그룹을 사용 안 함으로 바꾸거나, 상세 코드의 이름·사용 여부를 바꾸거나 삭제하면 위 사용처에 영향이 있어 저장 전에 한 번 더 확인합니다.
        </p>
      </section>
    );
  }
  return (
    <section aria-labelledby={headingId} data-code-usage="unread" className="space-y-1 rounded-md border border-border bg-card p-3">
      <Heading id={headingId} className="text-sm font-semibold text-foreground">이 제품이 읽지 않는 그룹</Heading>
      <p className="text-sm text-muted-foreground">
        이 제품의 코드는 이 그룹을 읽지 않습니다. 이름·사용 여부나 상세 코드를 고쳐도 제품 동작은 바뀌지 않습니다.
        다른 시스템이 이 값을 쓰는지는 이 화면이 알 수 없습니다.
      </p>
    </section>
  );
}
