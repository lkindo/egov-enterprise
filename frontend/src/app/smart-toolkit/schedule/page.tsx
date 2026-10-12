import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import ScheduleCalendarClient from './ScheduleCalendarClient';
import { getTodayYmd } from '@/lib/date/today-ymd';
import { connection } from 'next/server';

export const metadata: Metadata = {
  title: `일정 관리 | ${SITE_IDENTITY.frameworkName}`,
};

export default async function SchedulePage() {
 await connection();
 return <ScheduleCalendarClient initialYmd={getTodayYmd()} />;
}
