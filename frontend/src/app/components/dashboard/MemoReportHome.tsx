'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { canOpenPage } from '@/lib/auth/page-access';
import { memoReportService } from '@/services/business/memoreport/memoReportService';
import { HomeSummaryCard, summaryValue } from './HomeSummaryCard';

/**
 * 업무 홈의 '읽지 않은 받은 보고' 카드(2026-10-20). 메모 보고 기능 소유이고 업무 홈 셸에는 home-sections 기여
 * (extensions/memoreport/home-sections.ts)로 들어간다. 노출은 카드가 부르는 받은 보고 API 의 권한(MEMO_RPT_READ)이다.
 *
 * 원천은 받은 보고 목록(GET /memo-reports/received, 최신순)이고, 받은 사람이 아직 열지 않은 보고(첫 열람 시각 rptrInqDt 없음)를 센다.
 * 서버가 미열람 수를 따로 주지 않으므로 한 번에 받는 상한(100건)만큼 최근 보고를 읽는다 — 받은 보고가 그보다 많으면 범위를 밝힌다
 * (그보다 오래된 미열람은 세지 않는다). 최근 미열람 보고 두 건의 제목을 덧붙인다. 목적지는 받은 보고 탭(기본 탭)이고, 라우트 게이트와
 * 같은 판정(canOpenPage)으로 들어갈 수 있을 때만 링크한다 — 그 화면의 진입 권한은 카드의 노출 권한과 같다(MEMO_RPT_READ).
 */
const PAGE_LIMIT = 100;
const MAX_ITEMS = 2;

export function MemoReportReceivedCard() {
  const { user } = useAuth();
  const received = useQuery({
    queryKey: ['home', 'memo-reports-received', user?.id],
    queryFn: () => memoReportService.getReceivedReports({ page: 1, size: PAGE_LIMIT }),
    retry: false,
  });
  const list = received.data?.list ?? [];
  const unread = list.filter(report => !report.rptrInqDt);
  const partial = typeof received.data?.total === 'number' && received.data.total > list.length;
  const canOpen = canOpenPage(user, '/admin/operation/memo-reports');
  return (
    <HomeSummaryCard
      href={canOpen ? '/admin/operation/memo-reports' : undefined}
      label="읽지 않은 받은 보고"
      value={summaryValue(received, received.data ? unread.length : null)}
      items={unread.slice(0, MAX_ITEMS).map(report => report.rptTtl || '제목 없는 보고')}
      note={partial ? `최근 받은 보고 ${list.length}건에서 셌습니다.` : undefined}
    />
  );
}
