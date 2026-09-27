import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import MailSendHubClient from './MailSendHubClient';

export const metadata: Metadata = {
  title: `메일 발송 | ${SITE_IDENTITY.frameworkName}`,
};

export default function MailSendPage() {
  return <MailSendHubClient />;
}
