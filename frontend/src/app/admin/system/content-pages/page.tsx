import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import ContentPagesClient from './ContentPagesClient';

export const metadata: Metadata = {
  title: `콘텐츠 페이지 | ${SITE_IDENTITY.frameworkName}`,
};

export default function ContentPagesPage() {
  return <ContentPagesClient />;
}
