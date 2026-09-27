import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import SurveyManageDetailClient from './SurveyManageDetailClient';

export const metadata: Metadata = {
  title: `설문 상세 관리 | ${SITE_IDENTITY.frameworkName}`,
};

export default function Page() {
    return <SurveyManageDetailClient />;
}
