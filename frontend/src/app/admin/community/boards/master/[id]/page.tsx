import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { SITE_IDENTITY } from '@/config/site-identity';
import { isBoardOperationsId } from '../board-operations-tabs';
import { BoardOperationsClient } from './BoardOperationsClient';

export const metadata: Metadata = {
  title: `게시판 운영 | ${SITE_IDENTITY.frameworkName}`,
};

/**
 * 게시판 운영 화면(ADR-0040 결정 2) — /admin/community/boards/master/[id]?tab=posts|settings|access.
 * 게시판 ID 형식(`BBSMSTR_` 뒤 12자)이 아니면 없는 화면이다. 게시판이 실제로 있는지는 화면이 상세 조회로 확인한다.
 */
export default async function BoardOperationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isBoardOperationsId(id)) notFound();
  return (
    <Suspense fallback={<h1 className="sr-only">게시판 운영 화면을 불러오는 중</h1>}>
      <BoardOperationsClient bbsId={id} />
    </Suspense>
  );
}
