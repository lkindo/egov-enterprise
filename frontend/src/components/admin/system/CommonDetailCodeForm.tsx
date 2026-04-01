'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog";
import {
 Form,
 FormControl,
 FormField,
 FormItem,
 FormLabel,
 FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { CmmnDetailCode } from '@/types/foundation/system';
import { codeAdminService } from '@/services/foundation/system/CodeAdminService';

const formSchema = z.object({
 codeId: z.string().min(1, { message: "肄붾뱶ID님?꾩닔?낅땲님" }),
 code: z.string().min(1, { message: "肄붾뱶님?꾩닔?낅땲님" }),
 codeNm: z.string().min(1, { message: "肄붾뱶紐낆? ?꾩닔?낅땲님" }),
 codeDc: z.string().optional(),
 useAt: z.enum(['Y', 'N']),
});

interface CommonDetailCodeFormProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 data?: CmmnDetailCode;
 onSuccess: () => void;
 codes: Array<{ label: string, value: string }>;
}

export function CommonDetailCodeForm({ open, onOpenChange, data, onSuccess, codes }: CommonDetailCodeFormProps) {
 const isEdit = !!data;
 const form = useForm<z.infer<typeof formSchema>>({
 resolver: zodResolver(formSchema),
 defaultValues: {
 codeId: data?.codeId || '',
 code: data?.code || '',
 codeNm: data?.codeNm || '',
 codeDc: data?.codeDc || '',
 useAt: data?.useAt || 'Y',
 },
 });

 const onSubmit = async (values: z.infer<typeof formSchema>) => {
 try {
 if (isEdit) {
 await codeAdminService.updateDetailCode(values.codeId, values.code, values as CmmnDetailCode);
 } else {
 await codeAdminService.createDetailCode(values as CmmnDetailCode);
 }
 onSuccess();
 onOpenChange(false);
 } catch {
 console.error(error);
 alert('?님以님ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.');
 }
 };

 const handleDelete = async () => {
 if (!data?.codeId || !data?.code) return;
 if (confirm('?뺣쭚濡님?젣?섏떆寃좎뒿?덇퉴?')) {
 try {
 await codeAdminService.deleteDetailCode(data.codeId, data.code);
 onSuccess();
 onOpenChange(false);
 } catch {
 console.error(error);
 alert('님젣 以님ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.');
 }
 }
 };

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="sm:max-w-[425px]">
 <DialogHeader>
 <DialogTitle>{isEdit ? '怨듯넻?곸꽭肄붾뱶 ?섏젙' : '怨듯넻?곸꽭肄붾뱶 등록'}</DialogTitle>
 <DialogDescription>
 怨듯넻?곸꽭肄붾뱶 ?뺣낫瑜?{isEdit ? '?섏젙' : '?낅젰'}?⑸땲님
 </DialogDescription>
 </DialogHeader>
 <Form {...form}>
 <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
 <FormField
 control={form.control}
 name="codeId"
 render={({ field }) => (
 <FormItem>
 <FormLabel>肄붾뱶ID</FormLabel>
 <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isEdit}>
 <FormControl>
 <SelectTrigger>
 <SelectValue placeholder="肄붾뱶ID ?좏깮" />
 </SelectTrigger>
 </FormControl>
 <SelectContent>
 {codes.map((code) => (
 <SelectItem key={code.value} value={code.value}>
 {code.label}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 <FormMessage />
 </FormItem>
 )}
 />
 <FormField
 control={form.control}
 name="code"
 render={({ field }) => (
 <FormItem>
 <FormLabel>肄붾뱶</FormLabel>
 <FormControl>
 <Input placeholder="肄붾뱶" {...field} readOnly={isEdit} />
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />
 <FormField
 control={form.control}
 name="codeNm"
 render={({ field }) => (
 <FormItem>
 <FormLabel>肄붾뱶紐?/FormLabel>
 <FormControl>
 <Input placeholder="肄붾뱶紐? {...field} />
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />
 <FormField
 control={form.control}
 name="codeDc"
 render={({ field }) => (
 <FormItem>
 <FormLabel>?ㅻ챸</FormLabel>
 <FormControl>
 <Input placeholder="?ㅻ챸" {...field} />
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />
 <FormField
 control={form.control}
 name="useAt"
 render={({ field }) => (
 <FormItem>
 <FormLabel>?ъ슜?щ?</FormLabel>
 <Select onValueChange={field.onChange} defaultValue={field.value}>
 <FormControl>
 <SelectTrigger>
 <SelectValue placeholder="?ъ슜?щ?" />
 </SelectTrigger>
 </FormControl>
 <SelectContent>
 <SelectItem value="Y">?ъ슜 (Y)</SelectItem>
 <SelectItem value="N">誘몄궗님(N)</SelectItem>
 </SelectContent>
 </Select>
 <FormMessage />
 </FormItem>
 )}
 />
 <DialogFooter>
 {isEdit && (
 <Button type="button" variant="destructive" onClick={handleDelete}>
 님젣
 </Button>
 )}
 <Button type="submit">?님/Button>
 </DialogFooter>
 </form>
 </Form>
 </DialogContent>
 </Dialog>
 );
}

