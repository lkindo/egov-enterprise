import WorkHubClient from '@/app/admin/work-hub/WorkHubClient';
import { getTodayYmd } from '@/lib/date/today-ymd';
import { connection } from 'next/server';

export default async function WorkReportPage() {
 await connection();
 return <WorkHubClient defaultTab="REPORTS" initialYmd={getTodayYmd()} />;
}
