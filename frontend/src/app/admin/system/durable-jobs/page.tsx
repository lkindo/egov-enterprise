import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import DurableJobsClient from './DurableJobsClient';

export const metadata: Metadata = {
  title: `후속 작업 상태 | ${SITE_IDENTITY.frameworkName}`,
};

export default function Page() {
  return <DurableJobsClient />;
}
