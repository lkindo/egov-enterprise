'use client';

import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { extractErrorMessage } from '@/app/actions/actionUtils';
import { loginPolicyAdminService, LoginPolicy } from '@/services/foundation/system/LoginPolicyAdminService';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
;
import { Switch } from '@/components/ui/switch';
import { Clock, Globe, RefreshCcw, Settings2, Timer, Trash2, User, X } from 'lucide-react';
import { useAppForm } from '@/hooks/useAppForm';
import { z } from 'zod';
import { useToast } from '@/app/components/ui/toast';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
  FormErrorSummary,
} from '@/components/ui/form';

import { LoginPolicyDtoSchema } from '@/types/generated-zod';

const optionalStartTimeSchema = LoginPolicyDtoSchema.shape.bgngTm
  .unwrap()
  .trim()
  .max(5, '시작 시간은 HH:mm 형식으로 입력해 주세요.')
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, '시작 시간은 HH:mm 형식으로 입력해 주세요.')
  .or(z.literal(''));

const optionalEndTimeSchema = LoginPolicyDtoSchema.shape.endTm
  .unwrap()
  .trim()
  .max(5, '종료 시간은 HH:mm 형식으로 입력해 주세요.')
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, '종료 시간은 HH:mm 형식으로 입력해 주세요.')
  .or(z.literal(''));

export const loginPolicySchema = LoginPolicyDtoSchema.extend({
  ipAddr: LoginPolicyDtoSchema.shape.ipAddr
    .unwrap()
    .trim()
    .max(30, '접속 제한 IP는 최대 30자까지 입력할 수 있습니다.'),
  lmtYn: z.enum(['Y', 'N']),
  bgngTm: optionalStartTimeSchema,
  endTm: optionalEndTimeSchema,
  otpUseYn: z.enum(['Y', 'N']),
}).pick({
  ipAddr: true,
  lmtYn: true,
  bgngTm: true,
  endTm: true,
  otpUseYn: true,
});

const LOGIN_POLICY_FORM_LABELS = {
  ipAddr: '접속 제한 IP',
  bgngTm: '접속 허용 시작 시간',
  endTm: '접속 허용 종료 시간',
  lmtYn: '계정 접속 제한',
  otpUseYn: '2단계 인증 적용',
};

type LoginPolicyFormValues = z.infer<typeof loginPolicySchema>;

/** 서버(BaseSearchDto.pageUnit) 기본 페이지 크기와 동일하게 맞춘다. */
const PAGE_SIZE = 10;

/** A1 필수 — 페이지당 건수 선택지(카탈로그 §5 A1 '필수'). */
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

/**
 * 정책 설정 여부 배지.
 *
 * 이 목록은 **전체 사용자**를 좌측 조인으로 돌려주고 `regYn` 이 정책 존재 여부다. 그런데 종전
 * 표에는 그 열이 없어, 어느 행이 실제로 설정된 계정인지 알 방법이 해제 버튼의 유무뿐이었다 —
 * 이 목록에서 가장 먼저 알아야 할 사실이 보이지 않았다.
 *
 * ⚠ 색은 배경 틴트로만 말한다. `--warning-emphasis` 는 이 저장소에 정의돼 있지 않고,
 *   `--success-emphasis` 는 premium 라이트에서 자기 색 틴트 위 대비가 AA 미만이다.
 */
function PolicyRegisteredBadge({ registered }: { registered: boolean }) {
  return registered ? (
    <span className="inline-flex items-center rounded border border-success/40 bg-success/15 px-1.5 py-0.5 text-xs font-medium text-foreground">
      설정됨
    </span>
  ) : (
    <span className="text-xs text-muted-foreground">미설정</span>
  );
}

/** 이 화면이 소유한 쿼리 키. 무효화는 반드시 이 범위로만 좁힌다. */
const LOGIN_POLICIES_QUERY_KEY = ['admin-login-policies'] as const;

export default function LoginPolicyAdminClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [selectedPolicy, setSelectedPolicy] = useState<LoginPolicy | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  /**
   * 입력 컨트롤에는 원본(searchTerm)을, 서버 요청/queryKey 에는 디바운스 값만 쓴다.
   * 종전에는 수동 fetch + try/catch 라 조회 실패 시 목록이 빈 배열로 남아
   * '데이터 없음'으로 위장됐다(토스트만 뜨고 화면은 정상처럼 보임).
   */
  const [searchTerm, setSearchTerm] = useState('');
  const searchKeyword = useDebouncedValue(searchTerm, 300);
  const [page, setPage] = useState(1);
  /** 페이지당 건수(A1 필수). 크기는 반드시 queryKey 에 실어야 컨트롤이 조용히 죽지 않는다. */
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  const form = useAppForm<typeof loginPolicySchema>(loginPolicySchema, {
    defaultValues: {
      ipAddr: '',
      lmtYn: 'N',
      bgngTm: '',
      endTm: '',
      otpUseYn: 'N',
    }
  });

  /**
   * 목록 조회. 서버는 @ModelAttribute BaseSearchDto(pageIndex 1-based / pageUnit / searchKeyword)로 받는다.
   * pageIndex 는 직접 계산하지 않고 LoginPolicyAdminService·ApiService 의 page(0-based) 자동 매핑에 위임한다.
   */
  const { data: pageData, isLoading, error, refetch } = useQuery({
    queryKey: [...LOGIN_POLICIES_QUERY_KEY, page, searchKeyword, pageSize],
    queryFn: () => loginPolicyAdminService.getLoginPolicyList({
      page: page - 1,
      pageUnit: pageSize,
      searchKeyword,
    }),
  });

  const data: LoginPolicy[] = pageData?.list || [];
  const totalPage = pageData?.totalPage || 1;
  const total = pageData?.total || 0;

  const handleEdit = (policy: LoginPolicy) => {
    setSelectedPolicy(policy);
    form.reset({
      ipAddr: policy.ipAddr || '',
      lmtYn: policy.lmtYn || 'N',
      bgngTm: policy.bgngTm || '',
      endTm: policy.endTm || '',
      otpUseYn: policy.otpUseYn || 'N',
    });
    setIsEditModalOpen(true);
  };

  /*
    [2026-09-08] 신규 등록 경로를 붙인다.

    목록(searchLoginPolicies)은 **전체 사용자**를 좌측 조인으로 돌려주고 regYn 이 정책 존재
    여부다. 그런데 화면에는 등록 경로가 없어, 정책이 없는 사용자(regYn='N')를 골라 저장하면
    서버 updateLoginPolicy 가 findById(...).orElseThrow 로 **404** 를 냈다 — 새 사용자에게
    IP 제한·허용 시간대·OTP 를 걸 방법이 없었다(operation-consumer-census 축 1 이
    insertLoginPolicy 를 소비 0 으로 지목).
  */
  /*
    [2026-09-08] 정책 해제(삭제) 배선.

    ⚠ 정책을 **비우는 것**(lmtYn='N'·ipAddr='')과 **지우는 것**은 다르다. 비우면 행이 남아
    목록에 regYn='Y'(정책 보유)로 계속 표시되고, 지워야 regYn='N'(정책 없음)이 된다. 즉
    화면에는 정책을 완전히 해제할 방법이 없었다 — 등록 경로와 짝이 되는 기능 부재였다.

    정책이 없는 사용자(regYn='N')에게는 이 액션을 노출하지 않는다. 서버가 404 를 낼 뿐이고,
    사용자에게는 "지울 것이 없는데 삭제 버튼이 있는" 상태가 된다.
  */
  const releasePendingRef = useRef(false);
  const [releasePendingUserId, setReleasePendingUserId] = useState<string | null>(null);

  const handleRelease = async (policy: LoginPolicy) => {
    if (releasePendingRef.current || form.formState.isSubmitting) return;
    releasePendingRef.current = true;
    setReleasePendingUserId(policy.userId);
    try {
      const ok = await confirm({
        title: '로그인 정책 해제',
        message: `'${policy.userNm || policy.userId}'(${policy.userId})의 로그인 정책을 해제합니다. `
          + 'IP 제한·허용 시간대·2단계 인증 설정이 모두 사라지고 이 계정에는 로그인 제한이 적용되지 않습니다.',
        confirmText: '해제',
        variant: 'destructive',
      });
      if (!ok) return;

      await loginPolicyAdminService.deleteLoginPolicy(policy.userId);
      toast('로그인 정책을 해제했습니다.', 'success');
      queryClient.invalidateQueries({ queryKey: LOGIN_POLICIES_QUERY_KEY });
    } catch (releaseError: unknown) {
      toast(extractErrorMessage(releaseError, '정책 해제 중 오류가 발생했습니다.'), 'error');
    } finally {
      releasePendingRef.current = false;
      setReleasePendingUserId(null);
    }
  };

  const onFormSubmit = async (values: LoginPolicyFormValues) => {
    if (!selectedPolicy) return;
    const isNew = selectedPolicy.regYn !== 'Y';
    try {
      if (isNew) {
        await loginPolicyAdminService.createLoginPolicy(selectedPolicy.userId, values as Partial<LoginPolicy>);
      } else {
        await loginPolicyAdminService.saveLoginPolicy(selectedPolicy.userId, values as Partial<LoginPolicy>);
      }
      toast(isNew ? '로그인 정책을 등록했습니다.' : '로그인 정책이 성공적으로 업데이트되었습니다.', 'success');
      setIsEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: LOGIN_POLICIES_QUERY_KEY });
    } catch (error: unknown) {
      if (!form.applyServerErrors(error)) {
        toast(isNew ? '정책 등록 중 오류가 발생했습니다.' : '정책 저장 중 오류가 발생했습니다.', 'error');
      }
    }
  };

  /**
   * 목록 열.
   *
   * 종전 첫 열은 아바타 상자 + 이름 + ID 한 덩어리였고 정렬 가능한 열이 하나도 없었다.
   * 이름·ID 를 열로 가르고 정책 설정 여부를 노출한다.
   */
  const columns: Column<LoginPolicy>[] = [
    {
      header: '사용자명',
      sortKey: 'userNm',
      className: 'w-32',
      accessor: (item) => <span className="font-semibold text-foreground">{item.userNm || '-'}</span>,
    },
    {
      header: '사용자 ID',
      sortKey: 'userId',
      className: 'w-40',
      accessor: (item) => <span className="tabular-nums text-muted-foreground">{item.userId}</span>,
    },
    {
      header: '정책',
      sortKey: 'regYn',
      className: 'w-24',
      accessor: (item) => <PolicyRegisteredBadge registered={item.regYn === 'Y'} />,
    },
    {
      header: '제한 IP',
      className: 'w-40',
      accessor: (item) => (
        <span className="font-mono text-xs text-muted-foreground">{item.ipAddr || '제한 없음'}</span>
      ),
    },
    {
      header: '허용 시간',
      className: 'w-32',
      accessor: (item) => (
        <span className="tabular-nums text-muted-foreground">
          {item.bgngTm && item.endTm ? `${item.bgngTm} ~ ${item.endTm}` : '24시간'}
        </span>
      ),
    },
    {
      header: '계정 제한',
      sortKey: 'lmtYn',
      className: 'w-24',
      accessor: (item) => (
        item.lmtYn === 'Y'
          ? (
            <span className="inline-flex items-center rounded border border-destructive/40 bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-foreground">
              제한됨
            </span>
          )
          : <span className="text-xs text-muted-foreground">정상</span>
      ),
    },
    {
      header: '2단계 인증',
      sortKey: 'otpUseYn',
      className: 'w-28',
      // [2026-08-29] ADR-0002 한국어 우선. 종전 ACTIVE/DISABLED 는 영문 원시값이었다.
      accessor: (item) => (
        item.otpUseYn === 'Y'
          ? <span className="text-foreground">적용</span>
          : <span className="text-muted-foreground">미적용</span>
      ),
    },
    {
      header: '설정',
      className: 'text-right w-28',
      accessor: (item) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => handleEdit(item)}
            aria-label={`${item.userNm || item.userId} 로그인 정책 수정`}
          >
            <Settings2 size={16} aria-hidden="true" />
          </Button>
          {/* 정책이 있는 사용자에게만 해제를 노출한다 — 없는 대상에 삭제 버튼을 두면 거짓 어포던스다. */}
          {item.regYn === 'Y' ? (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => { void handleRelease(item); }}
              disabled={releasePendingUserId !== null}
              aria-busy={releasePendingUserId === item.userId || undefined}
              aria-label={`${item.userNm || item.userId} 로그인 정책 해제`}
              className="text-destructive-emphasis hover:bg-destructive/10"
            >
              <Trash2 size={16} aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  const otpEnabledCount = data.filter(p => p.otpUseYn === 'Y').length;
  const restrictedCount = data.filter(p => p.lmtYn === 'Y').length;

  return (
    <WorkListPage
      title="로그인 보안 정책 관리"
      description="사용자별 접속 IP·허용 시간대·2단계 인증(OTP)을 설정합니다. 목록은 전체 사용자이며 정책이 설정된 계정만 해제할 수 있습니다."
      breadcrumbItems={[{ label: '권한 보안' }, { label: '로그인 정책 관리' }]}
      totalCount={error ? undefined : total}
      filter={(
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1 sm:min-w-[16rem]">
            {/* ⚠ 이 접근 이름은 e2e(26-security-admin-coverage)가 셀렉터로 쓴다 —
                보이는 라벨과 같게 두어 WCAG 2.5.3 도 함께 만족시킨다. */}
            <label htmlFor="login-policy-search" className="mb-1 block text-xs font-medium text-muted-foreground">
              사용자 ID 또는 성명 검색
            </label>
            <Input
              id="login-policy-search"
              placeholder="사용자 ID 또는 성명 검색..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="h-[var(--filter-control-h)] text-[length:var(--font-size-body)]"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!searchTerm}
            onClick={() => { setSearchTerm(''); setPage(1); }}
            className="gap-1.5"
          >
            <X size={14} aria-hidden="true" /> 초기화
          </Button>
        </div>
      )}
      toolbarActions={(
        <>
          {/*
            종전에는 이 수치들이 96px 아이콘 박스를 가진 지표 카드 3장이었다. 전체 건수는 셸의
            총 건수가 이미 말하므로 중복이고, 나머지 둘은 **현재 페이지에서만** 셀 수 있는 값이라
            그 범위를 문구로 함께 말한다(종전에는 배지로 말했다 — 사실은 그대로 보존한다).
          */}
          <span className="text-[length:var(--font-size-body)] text-muted-foreground tabular-nums">
            현재 페이지 · 2단계 인증 {otpEnabledCount}건 · 접속 제한 {restrictedCount}건
          </span>
          <Button
            type="button"
            onClick={() => refetch()}
            variant="outline"
            size="sm"
            aria-label="로그인 정책 목록 새로고침"
            className="gap-1.5"
          >
            <RefreshCcw size={14} aria-hidden="true" className={isLoading ? 'animate-spin' : undefined} />
            새로고침
          </Button>
        </>
      )}
    >
      <StandardDataTable
        columns={columns}
        data={data}
        loading={isLoading}
        error={error as Error | null}
        onRetry={() => refetch()}
        keyField="userId"
        emptyMessage={searchKeyword ? `'${searchKeyword}' 검색 결과가 없습니다.` : '조회된 사용자가 없습니다.'}
        // 업무형 화면은 표 진입 애니메이션을 두지 않는다(카탈로그 §3 금지 목록).
        // ⚠ 총 건수는 셸의 결과 툴바가 단독으로 소유한다 — 여기 totalCount 를 다시 넘기면
        //   같은 수치가 표 위아래로 두 번 나온다(work-list-adoption-census 가 red 로 막는다).
        pagination={{
          currentPage: page,
          totalPages: totalPage,
          pageSize,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
          onPageSizeChange: (size) => { setPageSize(size); setPage(1); },
          onPageChange: (p) => setPage(p),
        }}
      />

      {/* Edit Modal */}
      <Dialog
        open={isEditModalOpen}
        onOpenChange={(open) => {
          if (!form.formState.isSubmitting) setIsEditModalOpen(open);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border-none shadow-2xl p-0">
          <div className="bg-surface-inverse p-8 text-surface-inverse-foreground flex items-center justify-between">
            <div className="space-y-1">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                  <Settings2 className="text-primary" />
                  {selectedPolicy?.regYn === 'Y' ? '정책 프로파일링' : '정책 신규 등록'}
                </DialogTitle>
              </DialogHeader>
              <p className="text-xs font-bold text-surface-inverse-foreground/40 tracking-[0.3em] uppercase">USER_ID: {selectedPolicy?.userId}</p>
              {selectedPolicy?.regYn !== 'Y' ? (
                <p className="text-xs font-semibold text-surface-inverse-foreground/70">
                  이 사용자에게는 아직 로그인 정책이 없습니다. 저장하면 새로 등록됩니다.
                </p>
              ) : null}
            </div>
            <div className="w-14 h-11 rounded-lg bg-white/10 flex items-center justify-center border border-white/5">
              <User size={24} className="text-primary" />
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onFormSubmit)} className="p-10 space-y-8" noValidate>
              <FormErrorSummary labels={LOGIN_POLICY_FORM_LABELS} onNavigate={form.focusError} />
              <div className="grid grid-cols-2 gap-8">
                <FormField
                  control={form.control}
                  name="ipAddr"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel className="text-xs font-bold tracking-widest uppercase opacity-40">접속 제한 IP</FormLabel>
                      <div className="relative group">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                        <FormControl>
                          <Input {...field} maxLength={30} placeholder="예: 192.168.0.1 (미입력 시 제한 없음)" className="pl-12 rounded-lg border-2 bg-muted/50 font-bold" />
                        </FormControl>
                      </div>
                      <FormDescription className="text-xs font-medium opacity-60">특정 IP에서만 접근을 허용하려면 입력하십시오.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bgngTm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold tracking-widest uppercase opacity-40">접속 허용 시작 시간</FormLabel>
                      <div className="relative group">
                        <Timer className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                        <FormControl>
                          <Input {...field} maxLength={5} placeholder="09:00" className="pl-12 rounded-lg border-2 bg-muted/50 font-bold" />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endTm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold tracking-widest uppercase opacity-40">접속 허용 종료 시간</FormLabel>
                      <div className="relative group">
                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                        <FormControl>
                          <Input {...field} maxLength={5} placeholder="18:00" className="pl-12 rounded-lg border-2 bg-muted/50 font-bold" />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="col-span-2 p-6 rounded-lg bg-muted border border-border space-y-6">
                  <FormField
                    control={form.control}
                    name="lmtYn"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-y-0">
                        <div className="space-y-1">
                          <FormLabel className="text-sm font-bold tracking-tight">계정 접속 전면 제한</FormLabel>
                          <p className="text-xs font-bold text-muted-foreground opacity-60 uppercase">BLOCK_ACCOUNT_ACCESS</p>
                        </div>
                        <FormControl>
                          <Switch 
                            checked={field.value === 'Y'} 
                            onCheckedChange={(checked) => field.onChange(checked ? 'Y' : 'N')} 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="h-px bg-border w-full" />

                  <FormField
                    control={form.control}
                    name="otpUseYn"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-y-0">
                        <div className="space-y-1">
                          <FormLabel className="text-sm font-bold tracking-tight">2단계 인증 (OTP) 필수 적용</FormLabel>
                          {/*
                            [2026-08-29] 라벨 밑의 'ENFORCE_MFA_AUTHENTICATION' 을 걷었다.
                            제품 어디에도 없는 식별자를 초록색으로 붙여 두어 이미 적용된 설정
                            이름처럼 읽혔다(바로 위 한국어 라벨과 중복되기도 한다).
                          */}
                        </div>
                        <FormControl>
                          <Switch 
                            checked={field.value === 'Y'} 
                            onCheckedChange={(checked) => field.onChange(checked ? 'Y' : 'N')} 
                            className="data-[state=checked]:bg-success"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <DialogFooter className="pt-6">
                <Button variant="ghost" type="button" disabled={form.formState.isSubmitting} onClick={() => setIsEditModalOpen(false)} className="px-8 rounded-lg font-bold text-xs tracking-widest uppercase">취소</Button>
                <Button type="submit" disabled={form.formState.isSubmitting} className="px-10 rounded-lg bg-surface-inverse text-surface-inverse-foreground font-bold text-xs tracking-widest uppercase shadow-xl hover:bg-primary transition-all">
                  {form.formState.isSubmitting ? '정책 적용 중…' : '정책 동기화 적용'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </WorkListPage>
  );
}
