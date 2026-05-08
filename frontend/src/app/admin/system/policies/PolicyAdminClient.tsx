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
 title: z.string().min(1, '��å ������ �ʼ��Դϴ�.'),
 content: z.string().min(1, '��å ������ �ʼ��Դϴ�.')
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
 toast.error('��å ����� �ҷ����� �� �����߽��ϴ�.');
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
 toast.success('��å�� ���������� �����Ǿ����ϴ�');
 setIsEditModalOpen(false);
 fetchPolicies();
 } catch (error) {
 console.error('Failed to update policy:', error);
 toast.error('��å ������ �����߽��ϴ�.');
 }
 };

 const columns: Column<SystemPolicy>[] = [
 {
 header: '��å ����(ID)',
 accessor: (item) => (
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
 <Settings size={14} />
 </div>
 <span className="font-bold tracking-tight uppercase">{item.id || item.type}</span>
 </div>
 )
 },
 {
 header: '��å ����',
 accessor: (item) => <span className="font-bold text-slate-700 text-left block">{item.title}</span>
 },
 {
 header: '���� ���',
 accessor: (item) => (
 <div className="max-w-xs truncate text-muted-foreground opacity-60 text-left">
 {item.content.replace(/<[^>]*>?/gm, '').substring(0, 50)}...
 </div>
 )
 },
 {
 header: '����',
 className: 'text-right',
 accessor: (item) => (
 <div className="flex justify-end">
 <Button 
 variant="ghost" 
 size="sm" 
 onClick={() => handleEdit(item)}
 className="hover:bg-primary/10 hover:text-primary rounded-lg"
 >
 <Edit2 size={14} className="mr-2" /> ����
 </Button>
 </div>
 )
 }
 ];

 return (
 <div className="p-10 space-y-10 animate-in fade-in duration-1000">
 <HubHeader 
 title="�ý��� ��å" 
 highlight="����" 
 subtitle="���� ���� ��� ���� ����, ������ ��å ��Ű��ó�� ���� �����մϴ�." 
 icon={FileText} 
 />

 <div className="hub-table-container">
 <div className="flex items-center justify-between mb-8 px-4 text-left">
 <div className="space-y-1 text-left">
 <h3 className="text-xl font-bold tracking-tight text-left">���� ��å ���</h3>
 <p className="text-sm text-muted-foreground text-left">�α���, �������� ó�� ��ħ �� �ý��� ���ݿ��� ���Ǵ� ��å ��� ������ �ε����մϴ�.</p>
 </div>
 <Button onClick={fetchPolicies} variant="outline" size="sm" className="rounded-lg border-2 font-bold text-xs tracking-widest uppercase">
 ���ΰ�ħ
 </Button>
 </div>

 <StandardDataTable 
 columns={columns} 
 data={policies} 
 loading={loading}
 keyField="type"
 emptyMessage="��ϵ� �ý��� ��å�� �����ϴ�."
 />
 </div>

 {/* Edit Modal */}
 <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
 <DialogContent className="max-w-5xl rounded-lg overflow-hidden border-none shadow-2xl p-0">
 <div className="bg-slate-900 p-8 text-white flex items-center justify-between">
 <DialogHeader>
 <DialogTitle className="text-2xl font-bold flex items-center gap-3">
 <Edit2 className="text-primary" /> ��å ���� : <span className="opacity-50 tracking-widest uppercase">{selectedPolicy?.id || selectedPolicy?.type}</span>
 </DialogTitle>
 </DialogHeader>
 <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase">
 <CheckCircle2 size={14} className="text-primary" /> �ǽð� ���� ���
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
 <FormLabel className="text-sm font-bold tracking-widest uppercase opacity-40 ml-2">��å ����</FormLabel>
 <FormControl>
 <Input 
 {...field}
 placeholder="��å ������ �Է��ϼ���"
 className="h-11 rounded-lg border-2 border-border/50 focus:border-primary/50 bg-slate-50/50 font-bold text-lg"
 />
 </FormControl>
 <FormMessage className="text-xs font-bold text-rose-600 px-1 mt-1" />
 </FormItem>
 )}
 />

 <ShadcnFormField
 control={form.control}
 name="content"
 render={({ field }) => (
 <FormItem className="space-y-3">
 <FormLabel className="text-sm font-bold tracking-widest uppercase opacity-40 ml-2">��å ����</FormLabel>
 <FormControl>
 <RichTextEditor 
 value={field.value} 
 onChange={field.onChange} 
 className="min-h-[400px]"
 />
 </FormControl>
 <FormMessage className="text-xs font-bold text-rose-600 px-1 mt-1" />
 </FormItem>
 )}
 />
 </div>

 <DialogFooter className="p-8 bg-slate-50 border-t border-border/50 flex items-center justify-between">
 <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
 * ���� ��� ����Ʈ���� �������̽� �� ��å �������� �ݿ��˴ϴ�.
 </div>
 <div className="flex gap-3">
 <Button variant="ghost" type="button" onClick={() => setIsEditModalOpen(false)} className="rounded-lg h-12 px-8 font-bold text-xs tracking-widest uppercase">���</Button>
 <Button 
 type="submit"
 disabled={form.formState.isSubmitting}
 className="rounded-lg h-12 px-8 bg-slate-900 hover:bg-primary text-white transition-all shadow-lg font-bold text-xs tracking-widest uppercase"
 >
 {form.formState.isSubmitting ? '���� ��...' : '���� ���� �ݿ��ϱ�'}
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

