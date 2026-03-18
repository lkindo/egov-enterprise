import { statsAdminService } from '@/services/admin/system/StatsAdminService';
import { cookies } from 'next/headers';
import GenericStatsClient from '../GenericStatsClient';

export const metadata = {
  title: '게시물 통계 분석 | 인텔리전트 통계',
};

export default async function BoardStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ fromDate?: string; toDate?: string }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  const fromDate = params.fromDate;
  const toDate = params.toDate;

  const initialData = await statsAdminService.getBbsStats({ fromDate, toDate }, axiosConfig).catch(() => []);

  return (
    <GenericStatsClient
      title="게시물 통계 아키텍처"
      subtitle="BOARD CONTENT ANALYTICS"
      breadcrumbs={[{ label: '시스템관리' }, { label: '통계관리' }, { label: '게시물통계' }]}
      initialData={initialData}
      statsName="게시물 수"
      exportFilename="board_content_stats"
    />
  );
}
