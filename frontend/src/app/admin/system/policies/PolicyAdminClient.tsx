'use client';

import React, { useState, useEffect } from 'react';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { policyAdminService, SystemPolicy } from '@/services/foundation/system/PolicyAdminService';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import dynamic from 'next/dynamic';
import { Settings, Edit2, FileText, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/app/components/ui/skeleton';

const RichTextEditor = dynamic(() => import('@/components/ui/RichTextEditor'), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px] w-full" />
});
import { z } from 'zod';
import { useAppForm } from '@/hooks/useAppForm';
import { toast } from 'sonner';
import {
  Form,
  FormControl,
  FormField as ShadcnFormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const policySchema = z.object({
  title: z.string().min(1, '?뺤콉 ?쒕ぉ? ?꾩닔?낅땲??'),
  content: z.string().min(1, '?뺤콉 ?댁슜? ?꾩닔?낅땲??')
});

type PolicyFormValues = z.infer<typeof policySchema>;

export default function PolicyAdminClient() {
  const [policies, setPolicies] = useState<SystemPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState<SystemPolicy | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const form = useAppForm(policySchema, {
    defaultValues: {
      title: '',
      content: ''
    }
  });

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const data = await policyAdminService.getPolicies();
      setPolicies(data);
    } catch (error) {
      console.error('Failed to fetch policies:', error);
      toast.error('?뺤콉 紐⑸줉??遺덈윭?ㅻ뒗 ???ㅽ뙣?덉뒿?덈떎.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleEdit = (policy: SystemPolicy) => {
    setSelectedPolicy(policy);
    form.reset({
      title: policy.title,
      content: policy.content
    });
    setIsEditModalOpen(true);
  };

  const onFormSubmit = async (values: PolicyFormValues) => {
    if (!selectedPolicy) return;
    try {
      await policyAdminService.updatePolicy(selectedPolicy.type || selectedPolicy.id || '', {
        title: values.title,
        content: values.content
      });
      toast.success('?뺤콉???깃났?곸쑝濡??섏젙?섏뿀?듬땲??);
      setIsEditModalOpen(false);
      fetchPolicies();
    } catch (error) {
      console.error('Failed to update policy:', error);
      toast.error('?뺤콉 ?섏젙???ㅽ뙣?덉뒿?덈떎.');
    }
  };

  const columns: Column<SystemPolicy>[] = [
    {
      header: '?뺤콉 ?좏삎(ID)',
      accessor: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Settings size={14} />
          </div>
          <span className="font-bold tracking-tighter uppercase">{item.id || item.type}</span>
        </div>
      )
    },
    {
      header: '?뺤콉 ?쒕ぉ',
      accessor: (item) => <span className="font-bold text-slate-700 text-left block">{item.title}</span>
    },
    {
      header: '?댁슜 ?붿빟',
      accessor: (item) => (
        <div className="max-w-xs truncate text-muted-foreground opacity-60 text-left">
          {item.content.replace(/<[^>]*>?/gm, '').substring(0, 50)}...
        </div>
      )
    },
    {
      header: '愿由?,
      className: 'text-right',
      accessor: (item) => (
        <div className="flex justify-end">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleEdit(item)}
            className="hover:bg-primary/10 hover:text-primary rounded-[0.1rem]"
          >
            <Edit2 size={14} className="mr-2" /> ?섏젙
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="p-10 space-y-10 animate-in fade-in duration-1000">
      <HubHeader 
        title="?쒖뒪???뺤콉" 
        highlight="愿由? 
        subtitle="?꾩궗 ?쒕퉬???댁쁺???꾪븳 踰뺤쟻, 愿由ъ쟻 ?뺤콉 ?꾪궎?띿쿂瑜??듯빀 愿由ы빀?덈떎." 
        icon={FileText} 
      />

      <div className="hub-table-container">
        <div className="flex items-center justify-between mb-8 px-4 text-left">
          <div className="space-y-1 text-left">
            <h3 className="text-xl font-black tracking-tight text-left">?쒕퉬???뺤콉 紐⑸줉</h3>
            <p className="text-sm text-muted-foreground text-left">濡쒓렇?? 媛쒖씤?뺣낫 泥섎━ 諛⑹묠 ???쒖뒪???꾨컲?먯꽌 ?듭슜?섎뒗 ?뺤콉 湲곕컲 ?뺣낫瑜??몃뜳?깊빀?덈떎.</p>
          </div>
          <Button onClick={fetchPolicies} variant="outline" size="sm" className="rounded-[0.1rem] border-2 font-black text-[10px] tracking-widest uppercase">
            ?덈줈怨좎묠
          </Button>
        </div>

        <StandardDataTable 
          columns={columns} 
          data={policies} 
          loading={loading}
          keyField="type"
          emptyMessage="?깅줉???쒖뒪???뺤콉???놁뒿?덈떎."
        />
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-5xl rounded-[0.1rem] overflow-hidden border-none shadow-2xl p-0">
          <div className="bg-slate-900 p-8 text-white flex items-center justify-between">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black flex items-center gap-3">
                <Edit2 className="text-primary" /> ?뺤콉 ?섏젙 : <span className="opacity-50 tracking-widest uppercase">{selectedPolicy?.id || selectedPolicy?.type}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase">
              <CheckCircle2 size={14} className="text-primary" /> ?ㅼ떆媛??몄쭛 紐⑤뱶
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onFormSubmit)}>
              <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar text-left">
                <ShadcnFormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-sm font-black tracking-widest uppercase opacity-40 ml-2">?뺤콉 ?쒕ぉ</FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          placeholder="?뺤콉 ?쒕ぉ???낅젰?섏꽭??
                          className="h-14 rounded-[0.1rem] border-2 border-border/50 focus:border-primary/50 bg-slate-50/50 font-black text-lg"
                        />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold text-rose-600 px-1 mt-1" />
                    </FormItem>
                  )}
                />

                <ShadcnFormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-sm font-black tracking-widest uppercase opacity-40 ml-2">?뺤콉 ?댁슜</FormLabel>
                      <FormControl>
                        <RichTextEditor 
                          value={field.value} 
                          onChange={field.onChange} 
                          className="min-h-[400px]"
                        />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold text-rose-600 px-1 mt-1" />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="p-8 bg-slate-50 border-t border-border/50 flex items-center justify-between">
                <div className="text-[10px] text-muted-foreground font-bold italic uppercase tracking-wider">
                  * ?섏젙 利됱떆 ?꾨줎?몄뿏???명꽣?섏씠??諛??뺤콉 ?섏씠吏??諛섏쁺?⑸땲??
                </div>
                <div className="flex gap-3">
                  <Button variant="ghost" type="button" onClick={() => setIsEditModalOpen(false)} className="rounded-[0.1rem] h-12 px-8 font-black text-[10px] tracking-widest uppercase">痍⑥냼</Button>
                  <Button 
                    type="submit"
                    disabled={form.formState.isSubmitting}
                    className="rounded-[0.1rem] h-12 px-8 bg-slate-900 hover:bg-primary text-white transition shadow-lg font-black text-[10px] tracking-widest uppercase"
                  >
                    {form.formState.isSubmitting ? '???以?..' : '蹂寃??ы빆 諛섏쁺?섍린'}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
