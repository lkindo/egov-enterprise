import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import MailHistoryHubClient from './MailHistoryHubClient';

export const metadata: Metadata = {
  title: `메일 발신 이력 | ${SITE_IDENTITY.frameworkName}`,
};

export default function MailHistoryPage() {
  return <MailHistoryHubClient />;
}
