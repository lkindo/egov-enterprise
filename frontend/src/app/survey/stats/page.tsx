import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import SurveyStatsClient from './SurveyStatsClient';

export const metadata: Metadata = {
  title: `설문 통계 | ${SITE_IDENTITY.frameworkName}`,
};

export default function SurveyStatsPage() {
  return <SurveyStatsClient />;
}
