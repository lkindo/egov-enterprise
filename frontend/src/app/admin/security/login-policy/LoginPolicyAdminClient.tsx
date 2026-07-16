'use client';

import React, { useState, useEffect } from 'react';
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
  Key, 
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
import { toast } from 'sonner';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';

import { LoginPolicyDtoSchema } from '@/types/generated-zod';

const loginPolicySchema = LoginPolicyDtoSchema.extend({
  lmtYn: z.enum(['Y', 'N']),
  bgngTm: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'HH:mm 형식이 아니거나 잘못된 시간입니다.').optional().or(z.literal('')),
  endTm: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'HH:mm 형식이 아니거나 잘못된 시간입니다.').optional().or(z.literal('')),
  otpUseYn: z.enum(['Y', 'N']),
});

type LoginPolicyFormValues = z.infer<typeof loginPolicySchema>;

export default function LoginPolicyAdminClient() {
  const [data, setData] = useState<LoginPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState<LoginPolicy | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const form = useAppForm<typeof loginPolicySchema>(loginPolicySchema, {
    defaultValues: {
      ipAddr: '',
      lmtYn: 'N',
      bgngTm: '',
      endTm: '',
      otpUseYn: 'N',
    }
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await loginPolicyAdminService.getLoginPolicyList({ searchKeyword: searchTerm });
      setData(response.list);
    } catch (error) {
      toast.error('로그인 정책 목록을 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
      toast.success('로그인 정책이 성공적으로 업데이트되었습니다.');
      setIsEditModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error('정책 저장 중 오류가 발생했습니다.');
    }
  };

  const columns: Column<LoginPolicy>[] = [
    {
      header: '사용자 정보',
      accessor: (item) => (
        <div className="flex items-center gap-4 py-2">
          <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-lg">
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
          <Fingerprint size={12} className={item.otpUseYn === 'Y' ? 'text-emerald-500' : 'text-slate-300'} />
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
        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} className="hover:bg-slate-900 hover:text-white rounded-lg transition-all">
          <Settings2 size={16} />
        </Button>
      )
    }
  ];

  const otpEnabledCount = data.filter(p => p.otpUseYn === 'Y').length;
  const restrictedCount = data.filter(p => p.lmtYn === 'Y').length;

  return (
    <div className="p-10 space-y-12 animate-in fade-in duration-1000 text-left">
      <HubHeader 
        title="로그인 보안 정책" 
        highlight="관리" 
        subtitle="개별 사용자의 접속 IP, 시간대 제한 및 2단계 인증(OTP) 활성화 여부를 정밀 제어합니다." 
        icon={ShieldAlert} 
      />

      <HubMetricGrid>
        <HubMetricCard title="전체 정책 수" value={data.length} icon={ShieldAlert} color="primary" />
        <HubMetricCard title="OTP 활성 계정" value={otpEnabledCount} icon={Fingerprint} color="emerald" status="SECURE" />
        <HubMetricCard title="접속 제한 계정" value={restrictedCount} icon={ShieldAlert} color="rose" />
        <HubMetricCard title="평균 보안 레벨" value="HIGH" icon={Key} color="amber" />
      </HubMetricGrid>

      <HubSectionCard title="보안 정책 인벤토리" description="전사 사용자별 로그인 거버넌스 설정 현황을 조회하고 수정합니다." icon={Settings2}>
        <div className="flex items-center justify-between mb-10 gap-6">
          <div className="relative group/search flex-1">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/search:text-primary transition-colors" size={20} />
            <Input 
              placeholder="사용자 ID 또는 성명 검색..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchData()}
              className="h-11 pl-16 pr-8 rounded-lg bg-muted border-2 border-border font-bold text-md tracking-tight shadow-inner" 
            />
          </div>
          <Button onClick={fetchData} variant="outline" className="h-11 w-16 rounded-lg border-2 border-border bg-white hover:bg-muted transition-all shadow-xl active:scale-95 group">
            <RefreshCcw size={24} className="text-muted-foreground group-hover:rotate-180 transition-transform duration-700" />
          </Button>
        </div>

        <StandardDataTable 
          columns={columns} 
          data={data} 
          loading={loading}
          keyField="userId"
          emptyMessage="등록된 로그인 정책이 없습니다."
          className="border-none bg-transparent"
        />
      </HubSectionCard>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl rounded-lg overflow-hidden border-none shadow-2xl p-0">
          <div className="bg-slate-900 p-8 text-white flex items-center justify-between">
            <div className="space-y-1">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                  <Settings2 className="text-primary" /> 정책 프로파일링
                </DialogTitle>
              </DialogHeader>
              <p className="text-xs font-bold text-white/40 tracking-[0.3em] uppercase">USER_ID: {selectedPolicy?.userId}</p>
            </div>
            <div className="w-14 h-11 rounded-lg bg-white/10 flex items-center justify-center border border-white/5">
              <User size={24} className="text-primary" />
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onFormSubmit)} className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <FormField
                  control={form.control}
                  name="ipAddr"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel className="text-xs font-bold tracking-widest uppercase opacity-40">접속 제한 IP</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
                          <Input {...field} placeholder="예: 192.168.0.1 (미입력 시 제한 없음)" className="h-11 pl-12 rounded-lg border-2 bg-muted/50 font-bold" />
                        </div>
                      </FormControl>
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
                      <FormControl>
                        <div className="relative group">
                          <Timer className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
                          <Input {...field} placeholder="09:00" className="h-11 pl-12 rounded-lg border-2 bg-muted/50 font-bold" />
                        </div>
                      </FormControl>
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
                      <FormControl>
                        <div className="relative group">
                          <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
                          <Input {...field} placeholder="18:00" className="h-11 pl-12 rounded-lg border-2 bg-muted/50 font-bold" />
                        </div>
                      </FormControl>
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

                  <div className="h-px bg-slate-200 w-full" />

                  <FormField
                    control={form.control}
                    name="otpUseYn"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-y-0">
                        <div className="space-y-1">
                          <FormLabel className="text-sm font-bold tracking-tight">2단계 인증 (OTP) 필수 적용</FormLabel>
                          <p className="text-xs font-bold text-emerald-600 tracking-widest uppercase">ENFORCE_MFA_AUTHENTICATION</p>
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
                <Button variant="ghost" type="button" onClick={() => setIsEditModalOpen(false)} className="h-11 px-8 rounded-lg font-bold text-xs tracking-widest uppercase">취소</Button>
                <Button type="submit" className="h-11 px-10 rounded-lg bg-slate-900 text-white font-bold text-xs tracking-widest uppercase shadow-xl hover:bg-primary transition-all">
                  정책 동기화 적용
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
