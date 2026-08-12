import WorkHubClient from '@/app/admin/work-hub/WorkHubClient';
import { getTodayYmd } from '@/lib/date/today-ymd';
import { connection } from 'next/server';

export default async function DeptJobPage() {
 await connection();
 return <WorkHubClient defaultTab="JOBS" initialYmd={getTodayYmd()} />;
}
