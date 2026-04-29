import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { getInitialAddressBookData } from './AddressBookListServer';
import { Skeleton } from "@/components/ui/skeleton";

// Optimization: Dynamic Import for Client Component
const AddressBookListClient = dynamic(() => import('./AddressBookListClient'), {
  ssr: true,
  loading: () => <AddressBookListSkeleton />
});

function AddressBookListSkeleton() {
  return (
    <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto w-full">
       <div className="h-64 bg-slate-50 flex items-center justify-center rounded-xl border-2 border-dashed border-slate-200">
          <p className="text-[10px] font-black tracking-widest text-muted-foreground animate-pulse uppercase">Syncing Address Book...</p>
       </div>
    </div>
  );
}

export default async function AddressBookListPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const pageNo = parseInt((params.pageNo as string) || '1');
  const searchWrd = (params.searchWrd as string) || '';

  // [P1: Waterfall Elimination] Initiate data promise on server
  const dataPromise = getInitialAddressBookData({ pageNo, pageUnit: 10, searchWrd });

  return (
    <Suspense fallback={<AddressBookListSkeleton />}>
      <AddressBookListClient dataPromise={dataPromise} initialParams={{ pageNo, searchWrd }} />
    </Suspense>
  );
}
