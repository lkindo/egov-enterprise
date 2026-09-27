import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import ScrapListClient from './ScrapListClient';

export const metadata: Metadata = {
  title: `스크랩 목록 | ${SITE_IDENTITY.frameworkName}`,
};

export default function Page() {
    return <ScrapListClient />;
}
