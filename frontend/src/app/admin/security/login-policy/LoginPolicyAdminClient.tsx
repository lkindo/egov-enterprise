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
import { Label } from '@/components/ui/label';
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

const loginPolicySchema = z.object({
  ipInfo: z.string().optional(),
  lmttAt: z.enum(['Y', 'N']),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'HH:mm 형식이 아니거나 잘못된 시간입니다.').optional().or(z.literal('')),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'HH:mm 형식이 아니거나 잘못된 시간입니다.').optional().or(z.literal('')),
  otpEnabledAt: z.enum(['Y', 'N']),
});

type LoginPolicyFormValues = z.infer<typeof loginPolicySchema>;

export default function LoginPolicyAdminClient() {
  const [data, setData] = useState<LoginPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState<LoginPolicy | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const form = useAppForm(loginPolicySchema, {
    defaultValues: {
      ipInfo: '',
      lmttAt: 'N',
      startTime: '',
      endTime: '',
      otpEnabledAt: 'N',
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
      ipInfo: policy.ipInfo || '',
      lmttAt: policy.lmttAt || 'N',
      startTime: policy.startTime || '',
      endTime: policy.endTime || '',
      otpEnabledAt: policy.otpEnabledAt || 'N',
    });
    setIsEditModalOpen(true);
  };

  const onFormSubmit = async (values: LoginPolicyFormValues) => {
    if (!selectedPolicy) return;
    try {
      await loginPolicyAdminService.saveLoginPolicy(selectedPolicy.emplyrId, values);
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
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
            <User size={18} />
          </div>
          <div className="text-left">
            <span className="font-black tracking-tight text-foreground block text-sm">{item.emplyrNm}</span>
            <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase opacity-40">{item.emplyrId}</span>
          </div>
        </div>
      )
    },
    {
      header: '제한 IP',
      accessor: (item) => (
        <div className="flex items-center gap-2">
          <Globe size={12} className="text-primary/40" />
          <span className="text-xs font-mono font-bold">{item.ipInfo || '제한 없음'}</span>
        </div>
      )
    },
    {
      header: '허용 시간',
      accessor: (item) => (
        <div className="flex items-center gap-2">
          <Clock size={12} className="text-amber-500/40" />
          <span className="text-xs font-bold">
            {item.startTime && item.endTime ? `${item.startTime} ~ ${item.endTime}` : '24시간'}
          </span>
        </div>
      )
    },
    {
      header: '계정 제한',
      accessor: (item) => (
        <HubStatusBadge 
          label={item.lmttAt === 'Y' ? '제한됨' : '정상'} 
          variant={item.lmttAt === 'Y' ? 'destructive' : 'success'} 
        />
      )
    },
    {
      header: '2FA(OTP)',
      accessor: (item) => (
        <div className="flex items-center gap-2">
          <Fingerprint size={12} className={item.otpEnabledAt === 'Y' ? 'text-emerald-500' : 'text-slate-300'} />
          <span className={`text-[10px] font-black tracking-widest ${item.otpEnabledAt === 'Y' ? 'text-emerald-600' : 'text-slate-400'}`}>
            {item.otpEnabledAt === 'Y' ? 'ACTIVE' : 'DISABLED'}
          </span>
        </div>
      )
    },
    {
      header: '설정',
      className: 'text-right',
      accessor: (item) => (
        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} className="hover:bg-slate-900 hover:text-white rounded-xl transition-all">
          <Settings2 size={16} />
        </Button>
      )
    }
  ];

  const otpEnabledCount = data.filter(p => p.otpEnabledAt === 'Y').length;
  const restrictedCount = data.filter(p => p.lmttAt === 'Y').length;

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
              className="h-16 pl-16 pr-8 rounded-2xl bg-slate-50 border-2 border-slate-100 font-black text-md tracking-tight shadow-inner" 
            />
          </div>
          <Button onClick={fetchData} variant="outline" className="h-16 w-16 rounded-2xl border-2 border-slate-100 bg-white hover:bg-slate-50 transition-all shadow-xl active:scale-95 group">
            <RefreshCcw size={24} className="text-slate-400 group-hover:rotate-180 transition-transform duration-700" />
          </Button>
        </div>

        <StandardDataTable 
          columns={columns} 
          data={data} 
          loading={loading}
          keyField="emplyrId"
          emptyMessage="등록된 로그인 정책이 없습니다."
          className="border-none bg-transparent"
        />
      </HubSectionCard>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl rounded-3xl overflow-hidden border-none shadow-2xl p-0">
          <div className="bg-slate-900 p-8 text-white flex items-center justify-between">
            <div className="space-y-1">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black flex items-center gap-3">
                  <Settings2 className="text-primary" /> 정책 프로파일링
                </DialogTitle>
              </DialogHeader>
              <p className="text-[10px] font-bold text-white/40 tracking-[0.3em] uppercase">USER_ID: {selectedPolicy?.emplyrId}</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/5">
              <User size={24} className="text-primary" />
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onFormSubmit)} className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <FormField
                  control={form.control}
                  name="ipInfo"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel className="text-xs font-black tracking-widest uppercase opacity-40">접속 제한 IP</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
                          <Input {...field} placeholder="예: 192.168.0.1 (미입력 시 제한 없음)" className="h-14 pl-12 rounded-xl border-2 bg-slate-50/50 font-bold" />
                        </div>
                      </FormControl>
                      <FormDescription className="text-[10px] font-medium opacity-60">특정 IP에서만 접근을 허용하려면 입력하십시오.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black tracking-widest uppercase opacity-40">접속 허용 시작 시간</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Timer className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
                          <Input {...field} placeholder="09:00" className="h-14 pl-12 rounded-xl border-2 bg-slate-50/50 font-bold" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black tracking-widest uppercase opacity-40">접속 허용 종료 시간</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
                          <Input {...field} placeholder="18:00" className="h-14 pl-12 rounded-xl border-2 bg-slate-50/50 font-bold" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="col-span-2 p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-6">
                  <FormField
                    control={form.control}
                    name="lmttAt"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-y-0">
                        <div className="space-y-1">
                          <FormLabel className="text-sm font-black tracking-tight">계정 접속 전면 제한</FormLabel>
                          <p className="text-[10px] font-bold text-muted-foreground opacity-60 uppercase">BLOCK_ACCOUNT_ACCESS</p>
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
                    name="otpEnabledAt"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-y-0">
                        <div className="space-y-1">
                          <FormLabel className="text-sm font-black tracking-tight">2단계 인증 (OTP) 필수 적용</FormLabel>
                          <p className="text-[10px] font-bold text-emerald-600 tracking-widest uppercase">ENFORCE_MFA_AUTHENTICATION</p>
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
                <Button variant="ghost" type="button" onClick={() => setIsEditModalOpen(false)} className="h-14 px-8 rounded-xl font-black text-[10px] tracking-widest uppercase">취소</Button>
                <Button type="submit" className="h-14 px-10 rounded-xl bg-slate-900 text-white font-black text-[10px] tracking-widest uppercase shadow-xl hover:bg-primary transition-all">
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
