import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import ApprovalHubClient from './ApprovalHubClient';

export const metadata: Metadata = {
  title: `전자결재 | ${SITE_IDENTITY.frameworkName}`,
};

export default function ApprovalInboxPage() {
  return <ApprovalHubClient />;
}
