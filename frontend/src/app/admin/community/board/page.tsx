import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import CommunityBoardClient from './CommunityBoardClient';

export const metadata: Metadata = {
  title: `게시판 목록 | ${SITE_IDENTITY.frameworkName}`,
};

export default function CommunityBoardPage() {
  return <CommunityBoardClient />;
}
