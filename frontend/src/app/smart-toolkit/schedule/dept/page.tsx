import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import ScheduleDeptClient from './ScheduleDeptClient';

export const metadata: Metadata = {
  title: `부서 일정 | ${SITE_IDENTITY.frameworkName}`,
};

export default function Page() {
    return <ScheduleDeptClient />;
}
