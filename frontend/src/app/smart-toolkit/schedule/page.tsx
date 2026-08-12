import WorkHubClient from '@/app/admin/work-hub/WorkHubClient';
import { getTodayYmd } from '@/lib/date/today-ymd';
import { connection } from 'next/server';

export default async function SchedulePage() {
 await connection();
 return <WorkHubClient defaultTab="SCHEDULE" initialYmd={getTodayYmd()} />;
}
