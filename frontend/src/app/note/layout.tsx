import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: `쪽지함 | ${SITE_IDENTITY.frameworkName}`,
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
