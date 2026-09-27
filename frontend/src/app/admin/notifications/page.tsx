import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import NotificationsClient from './NotificationsClient';

export const metadata: Metadata = {
  title: `알림 관리 | ${SITE_IDENTITY.frameworkName}`,
};

// [2026-09-06 DEC-OPS-038] 뷰 상태(?view=)가 사라져 useSearchParams 도, 그를 위한 Suspense 경계도 필요 없다.
export default function Page() {
  return <NotificationsClient />;
}
