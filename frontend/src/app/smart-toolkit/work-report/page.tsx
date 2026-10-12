import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import WorkReportClient from './WorkReportClient';
import { getTodayYmd } from '@/lib/date/today-ymd';
import { connection } from 'next/server';

export const metadata: Metadata = {
  title: `업무 보고 | ${SITE_IDENTITY.frameworkName}`,
};

export default async function WorkReportPage() {
 await connection();
 return <WorkReportClient initialYmd={getTodayYmd()} />;
}
