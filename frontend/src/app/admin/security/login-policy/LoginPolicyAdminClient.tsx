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
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'HH:mm ?•ì‹???„ë‹ˆê±°ë‚˜ ?˜ëª»???œê°„?…ë‹ˆ??').optional().or(z.literal('')),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'HH:mm ?•ì‹???„ë‹ˆê±°ë‚˜ ?˜ëª»???œê°„?…ë‹ˆ??').optional().or(z.literal('')),
  otpEnabledAt: z.enum(['Y', 'N']),
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
      toast.error('ë¡œê·¸???•ì±… ëª©ë¡??ë¶ˆëŸ¬?¤ëŠ” ???¤íŒ¨?ˆìŠµ?ˆë‹¤.');
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
      await loginPolicyAdminService.saveLoginPolicy(selectedPolicy.emplyrId, values as Partial<LoginPolicy>);
      toast.success('ë¡œê·¸???•ì±…???±ê³µ?ìœ¼ë¡??…ë°?´íŠ¸?˜ì—ˆ?µë‹ˆ??');
      setIsEditModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error('?•ì±… ?€??ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.');
    }
  };

  const columns: Column<LoginPolicy>[] = [
    {
      header: '?¬ìš©???•ë³´',
      accessor: (item) => (
        <div className="flex items-center gap-4 py-2">
          <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-lg">
            <User size={18} />
          </div>
          <div className="text-left">
            <span className="font-bold tracking-tight text-foreground block text-sm">{item.emplyrNm}</span>
            <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase opacity-40">{item.emplyrId}</span>
          </div>
        </div>
      )
    },
    {
      header: '?œí•œ IP',
      accessor: (item) => (
        <div className="flex items-center gap-2">
          <Globe size={12} className="text-primary/40" />
          <span className="text-xs font-mono font-bold">{item.ipInfo || '?œí•œ ?†ìŒ'}</span>
        </div>
      )
    },
    {
      header: '?ˆìš© ?œê°„',
      accessor: (item) => (
        <div className="flex items-center gap-2">
          <Clock size={12} className="text-amber-500/40" />
          <span className="text-xs font-bold">
            {item.startTime && item.endTime ? `${item.startTime} ~ ${item.endTime}` : '24?œê°„'}
          </span>
        </div>
      )
    },
    {
      header: 'ê³„ì • ?œí•œ',
      accessor: (item) => (
        <HubStatusBadge 
          label={item.lmttAt === 'Y' ? '?œí•œ?? : '?•ìƒ'} 
          variant={item.lmttAt === 'Y' ? 'error' : 'success'} 
        />
      )
    },
    {
      header: '2FA(OTP)',
      accessor: (item) => (
        <div className="flex items-center gap-2">
          <Fingerprint size={12} className={item.otpEnabledAt === 'Y' ? 'text-emerald-500' : 'text-slate-300'} />
          <span className={`text-xs font-bold tracking-widest ${item.otpEnabledAt === 'Y' ? 'text-emerald-600' : 'text-slate-400'}`}>
            {item.otpEnabledAt === 'Y' ? 'ACTIVE' : 'DISABLED'}
          </span>
        </div>
      )
    },
    {
      header: '?¤ì •',
      className: 'text-right',
      accessor: (item) => (
        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} className="hover:bg-slate-900 hover:text-white rounded-lg transition-all">
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
        title="ë¡œê·¸??ë³´ì•ˆ ?•ì±…" 
        highlight="ê´€ë¦? 
        subtitle="ê°œë³„ ?¬ìš©?ì˜ ?‘ì† IP, ?œê°„?€ ?œí•œ ë°?2?¨ê³„ ?¸ì¦(OTP) ?œì„±???¬ë?ë¥??•ë? ?œì–´?©ë‹ˆ??" 
        icon={ShieldAlert} 
      />

      <HubMetricGrid>
        <HubMetricCard title="?„ì²´ ?•ì±… ?? value={data.length} icon={ShieldAlert} color="primary" />
        <HubMetricCard title="OTP ?œì„± ê³„ì •" value={otpEnabledCount} icon={Fingerprint} color="emerald" status="SECURE" />
        <HubMetricCard title="?‘ì† ?œí•œ ê³„ì •" value={restrictedCount} icon={ShieldAlert} color="rose" />
        <HubMetricCard title="?‰ê·  ë³´ì•ˆ ?ˆë²¨" value="HIGH" icon={Key} color="amber" />
      </HubMetricGrid>

      <HubSectionCard title="ë³´ì•ˆ ?•ì±… ?¸ë²¤? ë¦¬" description="?„ì‚¬ ?¬ìš©?ë³„ ë¡œê·¸??ê±°ë²„?ŒìŠ¤ ?¤ì • ?„í™©??ì¡°íšŒ?˜ê³  ?˜ì •?©ë‹ˆ??" icon={Settings2}>
        <div className="flex items-center justify-between mb-10 gap-6">
          <div className="relative group/search flex-1">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/search:text-primary transition-colors" size={20} />
            <Input 
              placeholder="?¬ìš©??ID ?ëŠ” ?±ëª… ê²€??.." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchData()}
              className="h-12 pl-16 pr-8 rounded-lg bg-slate-50 border-2 border-slate-100 font-bold text-md tracking-tight shadow-inner" 
            />
          </div>
          <Button onClick={fetchData} variant="outline" className="h-12 w-16 rounded-lg border-2 border-slate-100 bg-white hover:bg-slate-50 transition-all shadow-xl active:scale-95 group">
            <RefreshCcw size={24} className="text-slate-400 group-hover:rotate-180 transition-transform duration-700" />
          </Button>
        </div>

        <StandardDataTable 
          columns={columns} 
          data={data} 
          loading={loading}
          keyField="emplyrId"
          emptyMessage="?±ë¡??ë¡œê·¸???•ì±…???†ìŠµ?ˆë‹¤."
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
                  <Settings2 className="text-primary" /> ?•ì±… ?„ë¡œ?Œì¼ë§?                </DialogTitle>
              </DialogHeader>
              <p className="text-xs font-bold text-white/40 tracking-[0.3em] uppercase">USER_ID: {selectedPolicy?.emplyrId}</p>
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
                  name="ipInfo"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel className="text-xs font-bold tracking-widest uppercase opacity-40">?‘ì† ?œí•œ IP</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
                          <Input {...field} placeholder="?? 192.168.0.1 (ë¯¸ì…?????œí•œ ?†ìŒ)" className="h-11 pl-12 rounded-lg border-2 bg-slate-50/50 font-bold" />
                        </div>
                      </FormControl>
                      <FormDescription className="text-xs font-medium opacity-60">?¹ì • IP?ì„œë§??‘ê·¼???ˆìš©?˜ë ¤ë©??…ë ¥?˜ì‹­?œì˜¤.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold tracking-widest uppercase opacity-40">?‘ì† ?ˆìš© ?œì‘ ?œê°„</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Timer className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
                          <Input {...field} placeholder="09:00" className="h-11 pl-12 rounded-lg border-2 bg-slate-50/50 font-bold" />
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
                      <FormLabel className="text-xs font-bold tracking-widest uppercase opacity-40">?‘ì† ?ˆìš© ì¢…ë£Œ ?œê°„</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
                          <Input {...field} placeholder="18:00" className="h-11 pl-12 rounded-lg border-2 bg-slate-50/50 font-bold" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="col-span-2 p-6 rounded-lg bg-slate-50 border border-slate-100 space-y-6">
                  <FormField
                    control={form.control}
                    name="lmttAt"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-y-0">
                        <div className="space-y-1">
                          <FormLabel className="text-sm font-bold tracking-tight">ê³„ì • ?‘ì† ?„ë©´ ?œí•œ</FormLabel>
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
                    name="otpEnabledAt"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-y-0">
                        <div className="space-y-1">
                          <FormLabel className="text-sm font-bold tracking-tight">2?¨ê³„ ?¸ì¦ (OTP) ?„ìˆ˜ ?ìš©</FormLabel>
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
                <Button variant="ghost" type="button" onClick={() => setIsEditModalOpen(false)} className="h-11 px-8 rounded-lg font-bold text-xs tracking-widest uppercase">ì·¨ì†Œ</Button>
                <Button type="submit" className="h-11 px-10 rounded-lg bg-slate-900 text-white font-bold text-xs tracking-widest uppercase shadow-xl hover:bg-primary transition-all">
                  ?•ì±… ?™ê¸°???ìš©
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
