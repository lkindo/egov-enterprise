import WorkHubClient from './WorkHubClient';
import { getTodayYmd } from '@/lib/date/today-ymd';
import { connection } from 'next/server';

export default async function WorkHubPage() {
 await connection();
 return <WorkHubClient initialYmd={getTodayYmd()} />;
}
