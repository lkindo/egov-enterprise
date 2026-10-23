import { Box, HardDrive } from 'lucide-react';
import { defineContributions } from '@/extensions/slots';
import {
  BOARD_POST_STATS_KEY,
  DATA_USAGE_STATS_KEY,
  loadBoardPostStats,
  loadDataUsageStats,
} from '@/app/admin/stats/board/board-stats-series';

/**
 * 게시판 → 통계 셸 기여(허브 분해 H4). 게시물·자료 이용 탭과 통계 요약의 '전체 등록 건수' 칸이다. 게시판이 빠진 구성에서는 이 파일이
 * 기능과 함께 직접 지워져 이 탭·칸만 사라지고 통계 셸은 그대로다.
 *
 * [2026-10-23 ADR-0040 결정 3] 게시판 통계는 등록 건수다 — 작성일 기준이고 예약·비밀·게시 종료 글과 사용 안 함 게시판 글을 센다(삭제한
 * 글만 뺀다). 예약 게시를 집행하면서 '게시물' 이 '지금 보이는 글' 로 읽히지 않게 칸·계열 이름과 집계 기준이 그 사실을 말한다. 탭 이름
 * '콘텐츠 지표' 는 메뉴·라우트 원장·E2E 와 묶여 그대로 둔다.
 *
 * - 콘텐츠 지표는 게시글을 실제로 세므로 미수집이 아니다. 자료 이용은 쓰는 쪽이 없는 미수집 축이라 빈 결과가 기간이 아니라 미수집을
 *   말하고, 그 탭의 요약 값은 '미수집' 으로만 보인다. [2026-10-20] 미수집 축이 모든 탭에 내던 '자료 이용 건수' 요약 칸은 걷었다 —
 *   요약은 탭마다 그 탭의 계열이다(A7).
 * - 탭은 곧 라우트다. 노출은 그 화면에 들어갈 수 있는 사람(라우트 게이트와 같은 판정)이고, 전체 등록 건수 칸은 요약 API 와 같은 권한이다.
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
    basis: '집계 기준: 일자별 등록 건수(작성일 기준) · 예약·비밀·게시 종료 글과 사용 안 함 게시판 글 포함 · 삭제한 글 제외 · 출처: 게시판 게시글',
    seriesName: '등록(작성일 기준)',
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
    basis: '집계 기준: 일자별 자료 이용 기록 · 이 기록을 쓰는 기능이 없어 수집되지 않는다 · 출처: 자료 이용 기록',
    icon: HardDrive,
    queryKey: DATA_USAGE_STATS_KEY,
    load: loadDataUsageStats,
    uninstrumented: true,
    visibleWhen: { page: '/admin/stats/data-usage' },
  },
  {
    id: 'TOTAL_POSTS',
    placement: 'overview-card',
    order: 30,
    title: '전체 등록 건수',
    field: 'totalPosts',
    visibleWhen: { permissions: ['STATS_ADMIN_READ'] },
  },
]);
