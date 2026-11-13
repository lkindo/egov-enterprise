import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import EventParticipationClient from './EventParticipationClient';

export const metadata: Metadata = {
  title: `행사 참가 | ${SITE_IDENTITY.frameworkName}`,
};

export default function EventParticipationPage() {
  return <EventParticipationClient />;
}
