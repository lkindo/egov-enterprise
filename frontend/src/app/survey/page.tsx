import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import SurveyClient from './SurveyClient';

export const metadata: Metadata = {
  title: `설문 목록 | ${SITE_IDENTITY.frameworkName}`,
};

export default function Page() {
  return <SurveyClient />;
}
