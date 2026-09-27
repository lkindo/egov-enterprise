import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import SurveyResponseClient from './SurveyResponseClient';

export const metadata: Metadata = {
  title: `설문 응답 목록 | ${SITE_IDENTITY.frameworkName}`,
};

export default function SurveyResponseListPage() {
  return <SurveyResponseClient />;
}
