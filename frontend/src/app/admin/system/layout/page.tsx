import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import LayoutManagerClient from './LayoutManagerClient';

export const metadata: Metadata = {
  title: `화면 구성 관리 | ${SITE_IDENTITY.frameworkName}`,
};

export default function DesignLayoutHubPage() {
    return (
        <div className="space-y-6">
            <LayoutManagerClient />
        </div>
    );
}
