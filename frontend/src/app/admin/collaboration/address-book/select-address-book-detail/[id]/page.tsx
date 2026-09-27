import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import SelectAddressBookDetailClient from './SelectAddressBookDetailClient';

export const metadata: Metadata = {
  title: `주소록 상세 | ${SITE_IDENTITY.frameworkName}`,
};

export default function Page() {
    return <SelectAddressBookDetailClient />;
}
