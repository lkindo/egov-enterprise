import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { getInitialAddressBookData } from './AddressBookListServer';

/** 목록 1페이지당 건수 — 클라이언트(AddressBookListClient)와 동일해야 한다. */
const PAGE_UNIT = 10;

// Optimization: Dynamic Import for Client Component
const AddressBookListClient = dynamic(() => import('./AddressBookListClient'), {
  ssr: true,
  loading: () => <AddressBookListSkeleton />
});

/** 실제 화면(헤더 + 지표 3장 + 목록)과 동일한 높이의 스켈레톤 — 로딩 중 레이아웃 이동(CLS) 방지. */
function AddressBookListSkeleton() {
  return (
    <div className="flex flex-col gap-12 w-full animate-pulse">
      <div className="h-24 bg-muted rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="h-40 bg-muted rounded-lg" />
        <div className="h-40 bg-muted rounded-lg" />
        <div className="h-40 bg-muted rounded-lg" />
      </div>
      <div className="h-[500px] bg-muted rounded-lg" />
    </div>
  );
}

export default async function AddressBookListPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const parsedPage = parseInt((params.pageNo as string) || '1', 10);
  const pageNo = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  const searchWrd = (params.searchWrd as string) || '';

  // [P1: Waterfall Elimination] Initiate data promise on server
  // 백엔드는 Spring Pageable(0-base page) 을 받는다.
  const dataPromise = getInitialAddressBookData({ page: pageNo - 1, size: PAGE_UNIT, searchWrd });

  return (
    <Suspense fallback={<AddressBookListSkeleton />}>
      <AddressBookListClient dataPromise={dataPromise} initialParams={{ pageNo, searchWrd }} />
    </Suspense>
  );
}
