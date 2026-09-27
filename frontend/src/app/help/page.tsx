import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import HelpClient from './HelpClient';

export const metadata: Metadata = {
  title: `도움말 | ${SITE_IDENTITY.frameworkName}`,
};

export default function Page() {
  return <HelpClient />;
}
