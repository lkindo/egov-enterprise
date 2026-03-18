import { statsAdminService } from '@/services/admin/system/StatsAdminService';
import { cookies } from 'next/headers';
import GenericStatsClient from '../GenericStatsClient';

export const metadata = {
  title: '보고서 생성 통계 | 인텔리전트 통계',
};

export default async function ReportStatsPage({
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

  const initialData = await statsAdminService.getReportStats({ fromDate, toDate }, axiosConfig).catch(() => []);

  return (
    <GenericStatsClient
      title="보고서 생성 인텔리전스"
      subtitle="REPORTING SYSTEM ANALYTICS"
      breadcrumbs={[{ label: '시스템관리' }, { label: '통계관리' }, { label: '보고서통계' }]}
      initialData={initialData}
      statsName="보고서 건수"
      exportFilename="report_system_stats"
    />
  );
}
