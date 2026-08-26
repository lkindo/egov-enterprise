import { navigateToDownload } from '@/lib/navigation/full-result-download';
import { periodToParams, type PeriodValue } from '@/app/components/patterns/period-filter';

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

export interface FullExportRequest {
  /** `/export.xlsx` 엔드포인트 절대 경로. */
  url: string;
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
  url,
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

  const params = new URLSearchParams();
  if (searchKeyword) params.set('searchKeyword', searchKeyword);
  const periodParams = period ? periodToParams(period) : {};
  if (periodParams.searchKeywordFrom) params.set('searchKeywordFrom', periodParams.searchKeywordFrom);
  if (periodParams.searchKeywordTo) params.set('searchKeywordTo', periodParams.searchKeywordTo);

  const query = params.toString();
  navigateToDownload(query ? `${url}?${query}` : url);
  return true;
}
