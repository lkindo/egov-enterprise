import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import WorkHubClient from './WorkHubClient';
import { getTodayYmd } from '@/lib/date/today-ymd';
import { connection } from 'next/server';

export const metadata: Metadata = {
  title: `업무·보고·일정 | ${SITE_IDENTITY.frameworkName}`,
};

export default async function WorkHubPage() {
 await connection();
 return <WorkHubClient initialYmd={getTodayYmd()} />;
}
