import { Box, Database, HardDrive } from 'lucide-react';
import { defineContributions } from '@/extensions/slots';
import {
  BOARD_POST_STATS_KEY,
  DATA_USAGE_STATS_KEY,
  loadBoardPostStats,
  loadDataUsageStats,
} from '@/app/admin/stats/board/board-stats-series';

/**
 * 게시판 → 통계 셸 기여(허브 분해 H4). 게시물·자료 이용 탭과 통계 요약의 '누적 게시물' 칸이다. 게시판이 빠진 구성에서는 이 파일이
 * 기능과 함께 직접 지워져 이 탭·칸만 사라지고 통계 셸은 그대로다.
 *
 * - 콘텐츠 지표는 게시글을 실제로 세므로 미수집이 아니다. 자료 이용은 쓰는 쪽이 없는 미수집 축이라 빈 차트가 기간이 아니라 미수집을
 *   말하고, 요약 칸은 '미수집' 으로만 보인다.
 * - 탭은 곧 라우트다. 노출은 그 화면에 들어갈 수 있는 사람(라우트 게이트와 같은 판정)이고, 누적 게시물 칸은 요약 API 와 같은 권한이다.
 */
export default defineContributions('stats-panels', [
  {
    id: 'CONTENT_STATS',
    placement: 'hub-tab',
    kind: 'series',
    order: 30,
    href: '/admin/stats/board',
    label: '콘텐츠 지표',
    title: '콘텐츠 지표 분석',
    icon: Box,
    queryKey: BOARD_POST_STATS_KEY,
    load: loadBoardPostStats,
    uninstrumented: false,
    visibleWhen: { page: '/admin/stats/board' },
  },
  {
    id: 'DATA_USAGE',
    placement: 'hub-tab',
    kind: 'series',
    order: 50,
    href: '/admin/stats/data-usage',
    label: '자료이용현황',
    title: '자료이용현황 분석',
    icon: HardDrive,
    queryKey: DATA_USAGE_STATS_KEY,
    load: loadDataUsageStats,
    uninstrumented: true,
    summary: { label: '자료 이용 건수', icon: Database },
    visibleWhen: { page: '/admin/stats/data-usage' },
  },
  {
    id: 'TOTAL_POSTS',
    placement: 'overview-card',
    order: 30,
    title: '누적 게시물',
    field: 'totalPosts',
    visibleWhen: { permissions: ['STATS_ADMIN_READ'] },
  },
]);
