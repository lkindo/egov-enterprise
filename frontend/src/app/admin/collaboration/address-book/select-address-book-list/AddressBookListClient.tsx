'use client';

import React, { use, useRef, useState } from 'react';
import Link from 'next/link';
import { addressbookUserService, AddressBook } from '@/services/business/user/addressbook/AddressbookUserService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2, RefreshCcw } from "lucide-react";
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { DataExportExcel } from '@/app/components/ui/data-export-excel';
import type { AddressBookInitialData } from './AddressBookListServer';
import { logErrorSafely } from '@/lib/safe-error-log';

const DEFAULT_PAGE_UNIT = 10;

interface AddressBookListClientProps {
 dataPromise: Promise<AddressBookInitialData>;
 initialParams: {
 pageNo: number;
 searchWrd: string;
 };
}

/**
 * A1(조회형 목록) archetype 이행 — docs/02-architecture/work-screen-grammar-catalog.md §5 A1.
 *
 * 종전에는 PageHeader + 영문 Hub 히어로 + 지표 카드 2장 + 유리질 섹션 카드가 표 위에 쌓여
 * 첫 데이터 행이 화면 한참 아래에 있었고, 총 건수는 지표 카드와 표 하단에 두 번 나왔다.
 * 셸로 옮기면서 장식 계층을 걷어내고, 총 건수는 툴바 한 곳으로, 내보내기는 결과 툴바(G3)로 모았다.
 * e2e 결속(heading '통합 주소록 관리' · textbox '주소록 검색' · button '검색')은 그대로 보존한다.
 */
export default function AddressBookListClient({ dataPromise, initialParams }: AddressBookListClientProps) {
 const initialData = use(dataPromise);
 const { toast } = useToast();
 const confirm = useConfirm();

 const [list, setList] = useState<AddressBook[]>(initialData.list);
 const [totalCount, setTotalCount] = useState(initialData.total);
 const [totalPages, setTotalPages] = useState(initialData.totalPage);
 const [pageNo, setPageNo] = useState(initialParams.pageNo);
 const [pageUnit, setPageUnit] = useState(DEFAULT_PAGE_UNIT);
 const [searchWrd, setSearchWrd] = useState(initialParams.searchWrd);
 const [loading, setLoading] = useState(false);
 const [deletingAddressBookSn, setDeletingAddressBookSn] = useState<number | null>(null);
 const deletePendingRef = useRef(false);
 // [P1-1] 조회 실패를 "데이터 없음"으로 위장하지 않는다. 서버 컴포넌트의 실패도 그대로 이어받는다.
 const [fetchError, setFetchError] = useState<Error | null>(
   initialData.fetchError ? new Error(initialData.fetchError) : null
 );

 const fetchList = async (targetPageNo: number, targetSearchWrd: string, targetPageUnit = pageUnit) => {
 setLoading(true);
 try {
 // 백엔드는 Spring Pageable(0-base page)을 받는다. pageNo/pageUnit 은 서버가 읽지 않는다.
 const response = await addressbookUserService.getAddressBooks({
   page: targetPageNo - 1,
   size: targetPageUnit,
   searchWrd: targetSearchWrd
 });

 setList(response.list || []);
 setTotalCount(response.total || 0);
 setTotalPages(response.totalPage || 0);
 setFetchError(null);
 } catch (error) {
 logErrorSafely('Failed to fetch address books', error);
 setFetchError(error instanceof Error ? error : new Error('주소록 목록을 불러오지 못했습니다.'));
 } finally {
 setLoading(false);
 }
 };

 const handleSearch = (e: React.FormEvent) => {
 e.preventDefault();
 setPageNo(1); // [P1-8] 3페이지에서 검색 시 빈 화면이 되는 결함 방지
 void fetchList(1, searchWrd);
 };

 /** 페이지 이동은 반드시 재조회를 동반해야 한다(과거에는 상태만 바뀌고 목록이 그대로였다). */
 const handlePageChange = (target: number) => {
 setPageNo(target);
 void fetchList(target, searchWrd);
 };

 /** 페이지당 건수를 바꾸면 현재 페이지 번호는 의미가 달라지므로 1페이지부터 다시 조회한다. */
 const handlePageSizeChange = (size: number) => {
 setPageUnit(size);
 setPageNo(1);
 void fetchList(1, searchWrd, size);
 };

 /** [P1-9] native confirm → useConfirm. 본문에 대상 주소록 명칭을 노출한다. */
 const handleDelete = async (item: AddressBook) => {
 if (deletePendingRef.current) return;
 deletePendingRef.current = true;
 setDeletingAddressBookSn(item.adbkSn);

 try {
 const ok = await confirm({
   title: '주소록 삭제',
   message: `'${item.adbkNm}' 주소록을 삭제합니다. 삭제 후에는 목록에서 조회할 수 없습니다.`,
   confirmText: '삭제',
   variant: 'destructive',
 });
 if (!ok) return;

 await addressbookUserService.deleteAddressBook(item.adbkSn);
 toast('주소록이 삭제되었습니다.', 'success');
 await fetchList(pageNo, searchWrd);
 } catch {
 toast('삭제에 실패했습니다.', 'error');
 } finally {
 deletePendingRef.current = false;
 setDeletingAddressBookSn(null);
 }
 };

 const columns: Column<AddressBook>[] = [
 {
 header: '번호',
 accessor: (_, index) => (
 <span className="font-mono text-xs font-bold text-muted-foreground">
 {index !== undefined ? (index + 1 + (pageNo - 1) * pageUnit).toString().padStart(2, '0') : '-'}
 </span>
 ),
 className: 'w-20 text-center'
 },
 {
 // G4 — 행을 식별하고 상세로 들어가는 진입점은 이 열이다.
 header: '주소록 명칭',
 accessor: (item) => (
 <Link href={`/admin/collaboration/address-book/select-address-book-detail/${item.adbkSn}`} className="group/item">
 <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">
 {item.adbkNm}
 </span>
 </Link>
 ),
 sortKey: 'adbkNm'
 },
 {
 // 목록 응답(AddressBookDto)에는 연락처·이메일이 존재하지 않는다(구성원은 상세 조회에서만 내려온다).
 // 항상 비어 있던 두 열을 제거하고 실제로 내려오는 값만 노출한다.
 /*
   [2026-08-29] '공개 범위' 가 아니라 '공개 범위(미적용)' 이다.
   이 값은 저장만 되고 접근을 바꾸지 않는다 — 목록 질의는 소유자(wrterId)로만 스코핑하고
   상세는 assertOwnerOrAdmin 으로 막는다. 서버가 이 값을 예외로 쓰지 않는 것은 의도된
   결정이며 사유도 코드에 남아 있다(코드값이 'P'/'G'/'PUBLIC'/'COMPANY' 로 혼재해
   표준화되지 않았고, 상세만 열면 열거 취약점이 된다 — AddressBookService.getAddressBook).
   '공개' 라고 적힌 값을 보고 조직에 공유됐다고 믿으면 반대 방향으로도 위험하다.
 */
 header: '공개 범위(미적용)',
 accessor: (item) => (
 <span className="text-xs font-bold text-muted-foreground tracking-tight">{item.rlsScopeCd || '-'}</span>
 ),
 sortKey: 'rlsScopeCd',
 className: 'w-32'
 },
 {
 header: '등록일자',
 accessor: (item) => (
 <span className="text-xs font-bold text-muted-foreground tabular-nums tracking-widest">
 {(item.crtDt || '').substring(0, 10).replace(/-/g, '.')}
 </span>
 ),
 sortKey: 'crtDt',
 className: 'w-32 text-center'
 },
 {
 header: '관리',
 accessor: (item) => {
 const isDeleting = deletingAddressBookSn === item.adbkSn;
 return (
 <div className="flex items-center justify-end pr-4">
 <Button
 variant="ghost"
 size="icon"
 disabled={deletingAddressBookSn !== null}
 aria-busy={isDeleting}
 aria-label={isDeleting ? `${item.adbkNm} 주소록 삭제 중` : `${item.adbkNm} 주소록 삭제`}
 onClick={() => { void handleDelete(item); }}
 className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive-emphasis transition-all"
 >
 {isDeleting
   ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
   : <Trash2 size={16} aria-hidden="true" />}
 </Button>
 </div>
 );
 },
 className: 'w-24 text-right'
 }
 ];

 return (
 <WorkListPage
 title="통합 주소록 관리"
 description="내가 등록한 연락처 목록입니다. 다른 사용자에게는 공유되지 않습니다."
 breadcrumbItems={[{ label: '협업관리' }, { label: '주소록' }]}
 filterStateKey="collaboration-address-book"
 // 조회 실패 시 총 건수는 0 이 아니라 '알 수 없음'이다 — 숫자를 찍으면 빈 결과와 구분되지 않는다.
 totalCount={fetchError ? undefined : totalCount}
 actions={
 <>
 <Button
 variant="outline"
 size="sm"
 aria-label="주소록 목록 새로고침"
 onClick={() => { void fetchList(pageNo, searchWrd); }}
 className="gap-2"
 >
 <RefreshCcw size={16} aria-hidden="true" />
 새로고침
 </Button>
 {/* 링크 안에 버튼을 중첩하면 접근성 트리에 상호작용 요소가 2개가 된다(HTML 명세 위반).
 asChild 로 링크 하나만 렌더한다 — 페이지 이동이므로 link 가 옳은 역할이다. */}
 <Button asChild size="sm" className="gap-2">
 <Link href="/admin/collaboration/address-book/insert-address-book">
 <Plus size={16} aria-hidden="true" /> 주소록 등록
 </Link>
 </Button>
 </>
 }
 filter={
 <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-[var(--form-gap)]">
 <div className="min-w-60 flex-1 space-y-1">
 <label htmlFor="address-book-search" className="text-[length:var(--font-size-body)] font-medium">
 주소록 명칭
 </label>
 <Input
 id="address-book-search"
 aria-label="주소록 검색"
 value={searchWrd}
 onChange={(e) => setSearchWrd(e.target.value)}
 placeholder="주소록 명칭으로 검색"
 />
 </div>
 <Button type="submit" size="sm">검색</Button>
 </form>
 }
 toolbarActions={
 /* [P1-6] 동작하는 CSV 내보내기 컴포넌트를 재사용한다(현재 페이지 기준). */
 <DataExportExcel
            scope="page"
 data={list}
 headers={[
   { label: '주소록 일련번호', key: 'adbkSn' },
   { label: '주소록 명칭', key: 'adbkNm' },
   { label: '공개 범위(미적용)', key: 'rlsScopeCd' },
   { label: '등록일자', key: 'crtDt' },
 ]}
 filename="주소록"
 className="flex h-[var(--control-h-sm)] items-center gap-2 rounded-md border border-border px-3 text-xs font-bold text-muted-foreground transition-colors hover:text-primary"
 />
 }
 >
 <StandardDataTable<AddressBook>
 accessibleLabel="주소록 목록"
 columns={columns}
 data={list}
 keyField="adbkSn"
 loading={loading}
 error={fetchError}
 onRetry={() => { void fetchList(pageNo, searchWrd); }}
 emptyMessage={emptyResultMessage(searchWrd, '등록된 주소록이 없습니다.')}
 pagination={{
 currentPage: pageNo,
 totalPages: totalPages,
 onPageChange: handlePageChange,
 // totalCount 는 셸 툴바가 소유한다(표 하단 중복 표기 방지).
 pageSize: pageUnit,
 onPageSizeChange: handlePageSizeChange
 }}
 />
 </WorkListPage>
 );
}
