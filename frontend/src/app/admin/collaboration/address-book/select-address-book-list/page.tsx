import { Suspense } from 'react';
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
      <h1 className="sr-only">주소록 목록을 불러오는 중</h1>
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

export default async function AddressBookListPage() {
  /*
    [2026-09-05] `?pageNo=` 읽기를 걷었다 — 바로 아래 `searchWrd` 와 **정확히 같은 상황**이다.

    URL 에 그 값을 싣는 코드가 저장소에 없다(producer 0건). 이 화면의 페이지 이동은
    `router.push`/`replace` 가 아니라 `AddressBookListClient` 의 `fetchList` 직접 호출로
    처리되고, 그 컴포넌트에는 `router`·`history`·`window.location` 이 한 줄도 없다.
    시드 메뉴(`modern_route`)에도 `pageNo` 참조가 없음을 확인했다.

    ⚠ PD-UX-002 승인 오버레이 작업에서 이 이름을 **승인 대상으로 올릴 뻔했다.** 그러나
      저장소가 발행한 적 없는 값에 데이터 등급을 매기는 것은 판정이 아니라 기록의 낭비이고,
      같은 파일이 이미 `searchWrd` 를 승인이 아니라 **삭제**로 처리한 선례가 있다. 같은 처리를 한다.

    ⚠ 되살리려면 producer 를 함께 만들어야 한다. 그때는 이름도 다시 정해야 한다 —
      `page` 는 이 화면에서 이미 다른 의미로 점유돼 있다(아래 Spring Pageable 0-base).
      URL 키만 `page` 로 바꾸면 한 화면에서 두 기준이 공존한다.
  */
  const pageNo = 1;

  /*
    [2026-09-04] `?searchWrd=` 읽기를 걷었다 — **URL 에 그 값을 싣는 코드가 저장소에 없었다.**
    이 화면의 검색어는 클라이언트 로컬 상태이고(`AddressBookListClient` 의 useState),
    검색은 `router.push`/`replace` 가 아니라 `fetchList` 직접 호출로 처리된다. 즉 producer 0건의
    소비자 전용 잔존 경로였고, 손으로 URL 을 만들지 않는 한 도달하지 않았다.
    시드 메뉴(`modern_route`)에도 `searchWrd` 참조가 없음을 확인했다.

    PD-UX-002 Q1 은 "URL 에 실리는 검색어를 전부 유지" 로 결정됐는데, 이 값은 **실린 적이 없어**
    그 결정의 대상이 아니다(Q4 죽은 표면). 되살리려면 producer 를 함께 만들어야 한다.
  */

  // [P1: Waterfall Elimination] Initiate data promise on server
  // 백엔드는 Spring Pageable(0-base page) 을 받는다.
  const dataPromise = getInitialAddressBookData({ page: pageNo - 1, size: PAGE_UNIT, searchWrd: '' });

  return (
    <Suspense fallback={<AddressBookListSkeleton />}>
      <AddressBookListClient dataPromise={dataPromise} initialParams={{ pageNo, searchWrd: '' }} />
    </Suspense>
  );
}
