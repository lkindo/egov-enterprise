import {
  navigateToDownload,
  type GeneratedBinaryNavigationOperation,
} from '@/lib/navigation/full-result-download';
import { periodToParams, type PeriodValue } from '@/app/components/patterns/period-filter';
import type { GeneratedOperationQuery } from '@/types/generated-operations';

/**
 * A6 서버측 전체 결과 export.
 *
 * 정본 스펙: docs/02-architecture/work-screen-grammar-catalog.md §5 A6 —
 * **필수: 서버측 export**, **금지: 현재 페이지만 내보내면서 `전체 내보내기`로 라벨링**.
 *
 * [왜 공용인가 — 2026-08-26]
 * 로그 5종이 같은 계약(`/export.xlsx`, 목록 API 와 동일한 검색 파라미터, 행 상한 400)을 쓴다.
 * 화면마다 URL 조립을 다시 쓰면 **어떤 화면은 기간을 빼먹는** 식으로 갈라지고, 그 결과 사용자는
 * 화면에서 좁힌 조건과 다른 파일을 받는다 — 조용히 틀린 결과라 파일을 열어 보기 전에는 모른다.
 *
 * ⚠ 상한 미러는 서버가 최종 판정자다. 여기 검사는 **불필요한 다운로드 시도를 막아 즉시 안내**하기
 *   위한 것이고, 서버도 같은 상한으로 400 을 돌려준다(둘 중 하나가 빠져도 안전한 쪽으로 실패).
 */
export const MAX_EXPORT_ROWS = 100_000;

type LogExportOperationId =
  | 'exportLoginLogs'
  | 'exportPrivacyLogs'
  | 'exportSystemLogs'
  | 'exportUserLogs'
  | 'exportWebLogs';
type LogExportOperation = GeneratedBinaryNavigationOperation<LogExportOperationId>;
type LogExportQuery = GeneratedOperationQuery<LogExportOperationId>;

export interface FullExportRequest {
  /** OpenAPI/codegen 정본에 결속된 `/export.xlsx` binary GET operation. */
  operation: LogExportOperation;
  /** 서버가 내려준 총 건수. 모르면 상한 검사를 건너뛴다(서버가 판정한다). */
  totalCount?: number;
  /** 목록 조회에 쓰는 것과 **같은** 검색어. 다르면 파일과 화면이 어긋난다. */
  searchKeyword?: string;
  /** 목록 조회에 쓰는 것과 **같은** 기간. */
  period?: PeriodValue;
  /** 상한 초과를 사용자에게 알리는 방법(화면의 토스트). */
  onTooMany: (message: string) => void;
}

/**
 * 상한을 확인하고 전체 결과 파일을 요청한다.
 *
 * @returns 다운로드를 시작했으면 true, 상한 초과로 막았으면 false.
 */
export function requestFullExport({
  operation,
  totalCount,
  searchKeyword,
  period,
  onTooMany,
}: FullExportRequest): boolean {
  if (typeof totalCount === 'number' && totalCount > MAX_EXPORT_ROWS) {
    onTooMany(
      `전체 결과가 ${totalCount.toLocaleString('ko-KR')}건으로 export 상한(`
      + `${MAX_EXPORT_ROWS.toLocaleString('ko-KR')}건)을 초과합니다. 검색 조건이나 기간을 좁혀 다시 시도하십시오.`,
    );
    return false;
  }

  /*
    [2026-09-05 규범 확정] 검색어를 다운로드 URL 에 싣는 것은 **승인된 상태**다
    (ADR-0009 §Decision 3, DEC-OPS-029 Q1).

    같은 화면의 목록 상태 훅(`admin/system/logs/use-log-url-state.ts`)은 검색어를 주소창에 싣지
    않는데, 여기서는 싣는다. 이 비대칭은 실수가 아니라 **경계가 주소창으로 정의됐기 때문**이다 —
    이 값은 `window.location.assign` 으로 나가는 다운로드 내비게이션이지 화면 상태가 아니다.

    ⚠ "일관성" 을 이유로 이 줄을 걷지 말 것. 제거하려면 POST + Blob 전환이 필요하고 그러면
      대용량 스트리밍의 메모리 이점을 잃으며, binary GET 계약(DEC-OPS-016) 영향 확인이 선행이다.
      소비 화면 5개 중 하나가 개인정보 접근 로그라는 사실도 결정 시점에 알려진 채 승인됐다.
  */
  const query: LogExportQuery = {};
  if (searchKeyword) query.searchKeyword = searchKeyword;
  const periodParams = period ? periodToParams(period) : {};
  if (periodParams.searchKeywordFrom) query.searchKeywordFrom = periodParams.searchKeywordFrom;
  if (periodParams.searchKeywordTo) query.searchKeywordTo = periodParams.searchKeywordTo;

  navigateToDownload(operation, Object.keys(query).length > 0 ? query : undefined);
  return true;
}
