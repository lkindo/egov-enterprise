import { statsAdminService } from '@/services/admin/system/StatsAdminService';
import { cookies } from 'next/headers';
import GenericStatsClient from '../GenericStatsClient';

export const metadata = {
  title: '자료 이용 현황 분석 | 인텔리전트 통계',
};

export default async function DataUsageStatsPage({
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

  const initialData = await statsAdminService.getDataUsageStats({ fromDate, toDate }, axiosConfig).catch(() => []);

  return (
    <GenericStatsClient
      title="자료 이용 현황 매트릭스"
      subtitle="DATA CONSUMPTION ANALYTICS"
      breadcrumbs={[{ label: '시스템관리' }, { label: '통계관리' }, { label: '자료이용현황' }]}
      initialData={initialData}
      statsName="이용 건수"
      exportFilename="data_usage_stats"
    />
  );
}
