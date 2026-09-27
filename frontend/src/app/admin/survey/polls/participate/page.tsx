import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import OnlinePollParticipateClient from './OnlinePollParticipateClient';

export const metadata: Metadata = {
  title: `온라인 투표 참여 | ${SITE_IDENTITY.frameworkName}`,
};

export default function OnlinePollParticipatePage() {
    return <OnlinePollParticipateClient />;
}
