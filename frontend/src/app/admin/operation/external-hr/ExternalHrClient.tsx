'use client';
import { useCallback, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { operationAdminService, type ExternalHr } from '@/services/foundation/operation/OperationAdminService';
import type { PageResponse } from '@/types/foundation/system';
import { useToast } from '@/app/components/ui/toast';
import { Plus, ShieldCheck, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { z } from 'zod';
import { useAppForm } from '@/hooks/useAppForm';
import {
  Form,
  FormControl,
  FormErrorSummary,
  FormField as ShadcnFormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import dynamic from 'next/dynamic';

const StandardModal = dynamic(() => import('@/app/components/ui/standard-modal').then(mod => mod.StandardModal), {
  ssr: false,
  // 모달은 열릴 때만 마운트되므로 레이아웃 점유가 없다. 로딩 placeholder 를 두지 않는다.
  loading: () => null,
});

import { ExternalHrDtoSchema } from '@/types/generated-zod';

export const externalHrSchema = ExternalHrDtoSchema.extend({
  evntSn: ExternalHrDtoSchema.shape.evntSn.int().positive('행사 일련번호를 입력하세요.'),
  otsdHrId: ExternalHrDtoSchema.shape.otsdHrId.min(1, '외부인사 ID를 입력하세요.'),
  otsdHrNm: ExternalHrDtoSchema.shape.otsdHrNm.unwrap().min(1, '성명을 입력하세요.'),
  ogdpInstNm: ExternalHrDtoSchema.shape.ogdpInstNm.unwrap().min(1, '소속기관을 입력하세요.'),
  areaNo: ExternalHrDtoSchema.shape.areaNo.unwrap().min(1, '지역번호를 입력하세요.'),
  mdTelno: ExternalHrDtoSchema.shape.mdTelno.unwrap().min(1, '국번을 입력하세요.'),
  endTelno: ExternalHrDtoSchema.shape.endTelno.unwrap().min(1, '종번을 입력하세요.'),
  emlAddr: ExternalHrDtoSchema.shape.emlAddr.unwrap().min(1, '이메일을 입력하세요.').email(),
  brdtYmd: ExternalHrDtoSchema.shape.brdtYmd.unwrap()
    .length(8, '생년월일 8자리를 입력하세요(예: 19900101).'),
});

type ExternalHrFormValues = z.infer<typeof externalHrSchema>;

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function ExternalHrClient({ initialPage }: { initialPage: PageResponse<ExternalHr> | null }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 페이지 번호는 URL 파생값이다(공유·새로고침·뒤로가기 복원).
  // 검색어는 개인정보 노출 우려로 URL 에 싣지 않는다(감사 D-13).
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const setPage = useCallback((next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete('page');
    else params.set('page', String(next));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [router, pathname, searchParams]);

  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const registerSubmitLock = useRef(false);

  const form = useAppForm(externalHrSchema, {
    defaultValues: {
      evntSn: 0,
      otsdHrId: '',
      otsdHrNm: '',
      ogdpInstNm: '',
      areaNo: '',
      mdTelno: '',
      endTelno: '',
      emlAddr: '',
      brdtYmd: '',
    }
  });

  const closeRegisterModal = () => {
    if (registerSubmitLock.current) return;
    setIsModalOpen(false);
  };

  /**
   * 목록 조회. 서버 응답은 PageResponse(list/total/page/size/totalPage) 이며,
   * Spring Data Pageable 은 0-based 이므로 page(1-based) - 1 을 전송한다.
   * 조회 실패는 삼키지 않고 StandardDataTable 의 error/onRetry 로 화면에 드러낸다.
   */
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-external-hr', searchKeyword, page, pageSize],
    queryFn: () => operationAdminService.getExternalHrList({
      name: searchKeyword,
      page: page - 1,
      size: pageSize,
    }),
    // SSR 프리페치 결과는 검색어 없는 1페이지에 한해서만 초기값으로 쓴다.
    // 서버 프리페치가 실패했으면 initialPage 가 null 이므로 클라이언트가 다시 조회하고 실패를 노출한다.
    initialData: (!searchKeyword && page === 1 && initialPage) ? initialPage : undefined,
  });

  const rows: ExternalHr[] = data?.list ?? [];
  const totalItems = data?.total ?? 0;
  const totalPages = data?.totalPage ?? Math.ceil(totalItems / pageSize);

  const handleSearch = (keyword: string) => {
    // 3페이지에서 검색해 빈 화면이 되는 것을 막는다.
    if (page !== 1) setPage(1);
    setSearchKeyword(keyword);
  };

  const onRegisterSubmit = async (values: ExternalHrFormValues) => {
    if (registerSubmitLock.current) return;
    registerSubmitLock.current = true;
    try {
      setRegisterLoading(true);
      const submitData: Partial<ExternalHr> = {
        ...values,
        gndrCd: 'M',
        crTypeCd: 'STANDARD',
      };
      await operationAdminService.createExternalHr(submitData);
      toast('성공적으로 등록되었습니다.', 'success');
      setIsModalOpen(false);
      form.reset();
      // 최신 등록건은 crtDt DESC 정렬로 1페이지 선두에 노출된다
      if (page !== 1) setPage(1);
      queryClient.invalidateQueries({ queryKey: ['admin-external-hr'] });
    } catch (error) {
      if (!form.applyServerErrors(error)) {
        toast('등록 중 오류가 발생했습니다.', 'error');
      }
    } finally {
      registerSubmitLock.current = false;
      setRegisterLoading(false);
    }
  };

  // 컬럼 접근자는 백엔드 ExternalHrDto 필드명(SSOT)만 사용한다.
  const columns: Column<ExternalHr>[] = [
    {
      header: '번호',
      accessor: (_, index) => (
        <span className="font-mono text-xs font-bold text-muted-foreground">
          {(index !== undefined ? index + 1 + (page - 1) * pageSize : 0).toString().padStart(2, '0')}
        </span>
      ),
      className: 'w-20 text-center'
    },
    {
      header: '성명',
      accessor: (item) => (
        <span className="font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">
          {item.otsdHrNm || '미지정'}
        </span>
      )
    },
    {
      header: '소속기관',
      accessor: (item) => (
        <span className="text-xs font-bold text-muted-foreground tracking-tight">
          {item.ogdpInstNm || '미지정'}
        </span>
      )
    },
    {
      header: '연락처',
      accessor: (item) => {
        const { areaNo, mdTelno, endTelno } = item;
        return (
          <span className="text-xs font-bold text-muted-foreground tabular-nums tracking-tighter">
            {areaNo && mdTelno && endTelno ? `${areaNo}-${mdTelno}-${endTelno}` : '미등록'}
          </span>
        );
      },
      className: 'w-40'
    },
    {
      header: '이메일',
      accessor: (item) => (
        <span className="text-xs font-bold text-muted-foreground tracking-tight">
          {item.emlAddr || '-'}
        </span>
      )
    },
    {
      header: '생년월일',
      accessor: (item) => (
        <span className="text-xs font-bold text-muted-foreground tabular-nums tracking-widest">
          {item.brdtYmd || '-'}
        </span>
      ),
      className: 'w-32 text-right pr-8'
    }
  ];

  return (
    <WorkListPage
      title="외부 인사 인벤토리"
      description="조직과 협력하는 외부 전문가 및 인사 정보를 조회·등록합니다."
      breadcrumbItems={[{ label: '운영지원' }, { label: '행사관리' }, { label: '외부인사정보' }]}
      filterStateKey="operation-external-hr"
      // 조회 실패 시 총 건수는 0 이 아니라 '알 수 없음'이다.
      totalCount={isError ? undefined : totalItems}
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            aria-label="외부 인사 목록 새로고침"
            className="gap-2"
          >
            <RefreshCcw size={16} aria-hidden="true" />
            새로고침
          </Button>
          <Button size="sm" onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus size={16} aria-hidden="true" /> 인사 등록
          </Button>
        </>
      }
      filter={
        <KeywordFilter
          label="인사 성명"
          placeholder="인사 성명으로 검색"
          value={searchKeyword}
          onSearch={handleSearch}
        />
      }
    >
      <StandardDataTable
        accessibleLabel="외부 인사 목록"
        columns={columns}
        data={rows}
        loading={isLoading}
        error={isError ? (error as Error) : null}
        onRetry={() => refetch()}
        emptyMessage={emptyResultMessage(searchKeyword, '등록된 외부인사 정보가 없습니다.')}
        keyField="otsdHrId"
        pagination={{
          currentPage: page,
          totalPages: totalPages,
          // totalCount 는 셸 툴바가 소유한다(표 하단 중복 표기 방지).
          pageSize,
          onPageChange: setPage,
          onPageSizeChange: (size) => { setPageSize(size); setPage(1); },
          pageSizeOptions: PAGE_SIZE_OPTIONS,
        }}
      />

      <StandardModal
        isOpen={isModalOpen}
        onClose={closeRegisterModal}
        title="외부 인사 정보 등록"
        maxWidth="xl"
        footer={
          <div className="flex w-full gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={closeRegisterModal}
              disabled={registerLoading || form.formState.isSubmitting}
              className="flex-1 h-11 rounded-lg font-bold text-xs tracking-widest border-2"
            >
              취소
            </Button>
            <Button
              type="submit"
              form="external-hr-register-form"
              disabled={registerLoading || form.formState.isSubmitting}
              className="flex-[2] h-11 bg-surface-inverse border-none text-surface-inverse-foreground rounded-lg font-bold text-xs tracking-widest shadow-2xl flex items-center justify-center gap-3 hover:bg-primary transition-all active:scale-95 group"
            >
              <ShieldCheck size={18} strokeWidth={3} className="text-primary group-hover:rotate-12 transition-transform" aria-hidden="true" />
              {registerLoading ? '등록 중…' : '최종 등록'}
            </Button>
          </div>
        }
      >
        <Form {...form}>
          <form
            id="external-hr-register-form"
            noValidate
            onSubmit={form.handleSubmit(onRegisterSubmit)}
            className="space-y-6 pt-4 text-left"
          >
            <FormErrorSummary
              labels={{
                evntSn: '행사 일련번호',
                otsdHrId: '외부인사 ID',
                otsdHrNm: '성명',
                ogdpInstNm: '소속기관',
                areaNo: '지역번호',
                mdTelno: '국번',
                endTelno: '종번',
                emlAddr: '이메일',
                brdtYmd: '생년월일',
              }}
              onNavigate={form.focusError}
            />
            <ShadcnFormField
              control={form.control}
              name="evntSn"
              required
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-muted-foreground tracking-widest">행사 일련번호</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      {...field}
                      value={field.value || ''}
                      onChange={(event) => field.onChange(event.target.valueAsNumber)}
                      placeholder="1"
                      className="h-11 rounded-lg bg-muted border-border"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <ShadcnFormField
              control={form.control}
              name="otsdHrId"
              required
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-muted-foreground tracking-widest">외부인사 ID</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      maxLength={20}
                      placeholder="HR-2026-001"
                      className="h-11 rounded-lg bg-muted border-border"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <ShadcnFormField
              control={form.control}
              name="otsdHrNm"
              required
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-muted-foreground tracking-widest">성명</FormLabel>
                  <FormControl>
                    <Input {...field} maxLength={100} placeholder="홍길동" className="h-11 rounded-lg bg-muted border-border" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <ShadcnFormField
              control={form.control}
              name="ogdpInstNm"
              required
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-muted-foreground tracking-widest">소속기관</FormLabel>
                  <FormControl>
                    <Input {...field} maxLength={100} placeholder="한국인재개발원" className="h-11 rounded-lg bg-muted border-border" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-3 gap-3">
              <ShadcnFormField
                control={form.control}
                name="areaNo"
                required
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-muted-foreground tracking-widest">지역번호</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={4} inputMode="numeric" placeholder="02" className="h-11 rounded-lg bg-muted border-border" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <ShadcnFormField
                control={form.control}
                name="mdTelno"
                required
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-muted-foreground tracking-widest">국번</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={4} inputMode="numeric" placeholder="1234" className="h-11 rounded-lg bg-muted border-border" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <ShadcnFormField
                control={form.control}
                name="endTelno"
                required
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-muted-foreground tracking-widest">종번</FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={4} inputMode="numeric" placeholder="5678" className="h-11 rounded-lg bg-muted border-border" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <ShadcnFormField
              control={form.control}
              name="emlAddr"
              required
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-muted-foreground tracking-widest">이메일</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" maxLength={50} placeholder="example@domain.com" className="h-11 rounded-lg bg-muted border-border" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <ShadcnFormField
              control={form.control}
              name="brdtYmd"
              required
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-muted-foreground tracking-widest">생년월일 (8자리)</FormLabel>
                  <FormControl>
                    <Input {...field} maxLength={8} inputMode="numeric" placeholder="19900101" className="h-11 rounded-lg bg-muted border-border" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </StandardModal>
    </WorkListPage>
  );
}
