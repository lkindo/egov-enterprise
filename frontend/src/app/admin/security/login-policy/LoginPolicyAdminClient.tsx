'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { loginPolicyAdminService, LoginPolicy } from '@/services/foundation/system/LoginPolicyAdminService';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
;
import { Switch } from '@/components/ui/switch';
import { 
  ShieldAlert,
  Clock,
  Globe,
  Search, 
  RefreshCcw, 
  Settings2, 
  User,
  Fingerprint,
  Timer
} from 'lucide-react';
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

/** 이 화면이 소유한 쿼리 키. 무효화는 반드시 이 범위로만 좁힌다. */
const LOGIN_POLICIES_QUERY_KEY = ['admin-login-policies'] as const;

export default function LoginPolicyAdminClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
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
    queryKey: [...LOGIN_POLICIES_QUERY_KEY, page, searchKeyword],
    queryFn: () => loginPolicyAdminService.getLoginPolicyList({
      page: page - 1,
      pageUnit: PAGE_SIZE,
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

  const onFormSubmit = async (values: LoginPolicyFormValues) => {
    if (!selectedPolicy) return;
    try {
      await loginPolicyAdminService.saveLoginPolicy(selectedPolicy.userId, values as Partial<LoginPolicy>);
      toast('로그인 정책이 성공적으로 업데이트되었습니다.', 'success');
      setIsEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: LOGIN_POLICIES_QUERY_KEY });
    } catch (error: unknown) {
      if (!form.applyServerErrors(error)) {
        toast('정책 저장 중 오류가 발생했습니다.', 'error');
      }
    }
  };

  const columns: Column<LoginPolicy>[] = [
    {
      header: '사용자 정보',
      accessor: (item) => (
        <div className="flex items-center gap-4 py-2">
          <div className="w-10 h-10 rounded-lg bg-surface-inverse flex items-center justify-center text-surface-inverse-foreground shadow-lg">
            <User size={18} />
          </div>
          <div className="text-left">
            <span className="font-bold tracking-tight text-foreground block text-sm">{item.userNm}</span>
            <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase opacity-40">{item.userId}</span>
          </div>
        </div>
      )
    },
    {
      header: '제한 IP',
      accessor: (item) => (
        <div className="flex items-center gap-2">
          <Globe size={12} className="text-primary/40" />
          <span className="text-xs font-mono font-bold">{item.ipAddr || '제한 없음'}</span>
        </div>
      )
    },
    {
      header: '허용 시간',
      accessor: (item) => (
        <div className="flex items-center gap-2">
          <Clock size={12} className="text-amber-500/40" />
          <span className="text-xs font-bold">
            {item.bgngTm && item.endTm ? `${item.bgngTm} ~ ${item.endTm}` : '24시간'}
          </span>
        </div>
      )
    },
    {
      header: '계정 제한',
      accessor: (item) => (
        <HubStatusBadge 
          label={item.lmtYn === 'Y' ? '제한됨' : '정상'} 
          variant={item.lmtYn === 'Y' ? 'error' : 'success'} 
        />
      )
    },
    {
      header: '2FA(OTP)',
      accessor: (item) => (
        <div className="flex items-center gap-2">
          <Fingerprint size={12} className={item.otpUseYn === 'Y' ? 'text-emerald-500' : 'text-muted-foreground'} />
          <span className={`text-xs font-bold tracking-widest ${item.otpUseYn === 'Y' ? 'text-emerald-600' : 'text-muted-foreground'}`}>
            {item.otpUseYn === 'Y' ? 'ACTIVE' : 'DISABLED'}
          </span>
        </div>
      )
    },
    {
      header: '설정',
      className: 'text-right',
      accessor: (item) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleEdit(item)}
          aria-label={`${item.userNm || item.userId} 로그인 정책 수정`}
          className="hover:bg-surface-inverse hover:text-surface-inverse-foreground rounded-lg transition-all"
        >
          <Settings2 size={16} aria-hidden="true" />
        </Button>
      )
    }
  ];

  const otpEnabledCount = data.filter(p => p.otpUseYn === 'Y').length;
  const restrictedCount = data.filter(p => p.lmtYn === 'Y').length;

  return (
    /* 루트 레이아웃이 이미 max-w-7xl + p-6/md:p-12/lg:p-16 을 주므로 화면별 p-10 은 이중 여백이라 제거했다. */
    <div className="space-y-12 animate-in fade-in duration-1000 text-left">
      <HubHeader 
        headingLevel={1}
        title="로그인 보안 정책" 
        highlight="관리" 
        subtitle="개별 사용자의 접속 IP, 시간대 제한 및 2단계 인증(OTP) 활성화 여부를 정밀 제어합니다." 
        icon={ShieldAlert} 
      />

      {/*
        전체 건수만 서버 집계이고, OTP/제한 계정 수는 현재 페이지에서만 셀 수 있다 —
        배지로 집계 범위를 명시한다. 종전의 '평균 보안 레벨=HIGH' 는 산출 근거가 없어 삭제했다.
      */}
      <HubMetricGrid>
        <HubMetricCard title="전체 정책 수" value={total} icon={ShieldAlert} color="primary" status="서버 집계" />
        <HubMetricCard title="OTP 활성 계정" value={otpEnabledCount} icon={Fingerprint} color="emerald" status="현재 페이지" />
        <HubMetricCard title="접속 제한 계정" value={restrictedCount} icon={ShieldAlert} color="rose" status="현재 페이지" />
      </HubMetricGrid>

      <HubSectionCard title="보안 정책 인벤토리" description="전사 사용자별 로그인 거버넌스 설정 현황을 조회하고 수정합니다." icon={Settings2}>
        <div className="flex items-center justify-between mb-10 gap-6">
          <div className="relative group/search flex-1">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/search:text-primary transition-colors" size={20} />
            <Input
              aria-label="사용자 ID 또는 성명 검색"
              placeholder="사용자 ID 또는 성명 검색..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="h-11 pl-16 pr-8 rounded-lg bg-muted border-2 border-border font-bold text-md tracking-tight shadow-inner"
            />
          </div>
          <Button onClick={() => refetch()} variant="outline" aria-label="로그인 정책 목록 새로고침" className="h-11 w-16 rounded-lg border-2 border-border bg-card hover:bg-muted transition-all shadow-xl active:scale-95 group">
            <RefreshCcw size={24} aria-hidden="true" className="text-muted-foreground group-hover:rotate-180 transition-transform duration-700" />
          </Button>
        </div>

        <StandardDataTable
          columns={columns}
          data={data}
          loading={isLoading}
          error={error as Error | null}
          onRetry={() => refetch()}
          keyField="userId"
          emptyMessage="등록된 로그인 정책이 없습니다."
          className="border-none bg-transparent"
          pagination={{
            currentPage: page,
            totalPages: totalPage,
            totalCount: total,
            pageSize: PAGE_SIZE,
            onPageChange: (p) => setPage(p)
          }}
        />
      </HubSectionCard>

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
                  <Settings2 className="text-primary" /> 정책 프로파일링
                </DialogTitle>
              </DialogHeader>
              <p className="text-xs font-bold text-surface-inverse-foreground/40 tracking-[0.3em] uppercase">USER_ID: {selectedPolicy?.userId}</p>
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
                          <Input {...field} maxLength={30} placeholder="예: 192.168.0.1 (미입력 시 제한 없음)" className="h-11 pl-12 rounded-lg border-2 bg-muted/50 font-bold" />
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
                          <Input {...field} maxLength={5} placeholder="09:00" className="h-11 pl-12 rounded-lg border-2 bg-muted/50 font-bold" />
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
                          <Input {...field} maxLength={5} placeholder="18:00" className="h-11 pl-12 rounded-lg border-2 bg-muted/50 font-bold" />
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
                            className="data-[state=checked]:bg-emerald-500"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <DialogFooter className="pt-6">
                <Button variant="ghost" type="button" disabled={form.formState.isSubmitting} onClick={() => setIsEditModalOpen(false)} className="h-11 px-8 rounded-lg font-bold text-xs tracking-widest uppercase">취소</Button>
                <Button type="submit" disabled={form.formState.isSubmitting} className="h-11 px-10 rounded-lg bg-surface-inverse text-surface-inverse-foreground font-bold text-xs tracking-widest uppercase shadow-xl hover:bg-primary transition-all">
                  {form.formState.isSubmitting ? '정책 적용 중…' : '정책 동기화 적용'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
