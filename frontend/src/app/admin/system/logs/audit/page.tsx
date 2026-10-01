import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import AuditJournalClient from './AuditJournalClient';

export const metadata: Metadata = {
  title: `민감 작업 감사 원장 | ${SITE_IDENTITY.frameworkName}`,
};

export default function Page() {
  return <AuditJournalClient />;
}
