import { statsAdminService } from '@/services/foundation/system/StatsAdminService';
import type { StatsDateRange } from '@/extensions/slots';

/**
 * 통계 셸의 게시물·자료 이용 탭이 쓰는 조회 키와 로더(허브 분해 H4). 게시판이 소유한다 — 게시판 기여(stats-panels)가 이름으로만
 * 가리키고, 셸은 이 값으로 조회를 만든다. 조회 키는 종전과 같다(셸이 집계 기간을 덧붙인다).
 *
 * 게시물 탭은 게시글을 실제로 센다(boardRepository.countPostsByDate — 쓰는 쪽이 있다). 자료 이용 탭은 자료 이용 기록을 읽는데
 * 그 표에는 쓰는 코드가 없어 미수집 축이다(기여의 uninstrumented).
 */
export const BOARD_POST_STATS_KEY = ['admin-stats-bbs'] as const;
export const DATA_USAGE_STATS_KEY = ['admin-stats-data-usage'] as const;

export function loadBoardPostStats(range?: StatsDateRange) {
  return statsAdminService.getBbsStats(range);
}

export function loadDataUsageStats(range?: StatsDateRange) {
  return statsAdminService.getDataUsageStats(range);
}
