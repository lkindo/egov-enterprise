'use client';

import { useState } from 'react';
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
import { CmmnClCode } from '@/types/foundation/system"';
import { codeAdminService } from '@/services/foundation/system'/CodeAdminService';

const formSchema = z.object({
 clCode: z.string().min(1, { message: "분류코드는 필수입니다." }),
 clCodeNm: z.string().min(1, { message: "분류코드명은 필수입니다." }),
 clCodeDc: z.string().optional(),
 useAt: z.enum(['Y', 'N']),
});

interface CommonClCodeFormProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 data?: CmmnClCode;
 onSuccess: () => void;
}

export function CommonClCodeForm({ open, onOpenChange, data, onSuccess }: CommonClCodeFormProps) {
 const isEdit = !!data;
 const form = useForm<z.infer<typeof formSchema>>({
 resolver: zodResolver(formSchema),
 defaultValues: {
 clCode: data?.clCode || '',
 clCodeNm: data?.clCodeNm || '',
 clCodeDc: data?.clCodeDc || '',
 useAt: data?.useAt || 'Y',
 },
 });

 const onSubmit = async (values: z.infer<typeof formSchema>) => {
 try {
 if (isEdit && data?.clCode) {
 await codeAdminService.updateClCode(data.clCode, { ...values, clCode: data.clCode } as CmmnClCode); // clCode is read-only in edit
 } else {
 await codeAdminService.createClCode(values as CmmnClCode);
 }
 onSuccess();
 onOpenChange(false);
 } catch (error) {
 console.error(error);
 alert('저장 중 오류가 발생했습니다.');
 }
 };

 const handleDelete = async () => {
 if (!data?.clCode) return;
 if (confirm('정말로 삭제하시겠습니까?')) {
 try {
 await codeAdminService.deleteClCode(data.clCode);
 onSuccess();
 onOpenChange(false);
 } catch (error) {
 console.error(error);
 alert('삭제 중 오류가 발생했습니다.');
 }
 }
 };

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="sm:max-w-[425px]">
 <DialogHeader>
 <DialogTitle>{isEdit ? '공통분류코드 수정' : '공통분류코드 등록'}</DialogTitle>
 <DialogDescription>
 공통분류코드 정보를 {isEdit ? '수정' : '입력'}합니다.
 </DialogDescription>
 </DialogHeader>
 <Form {...form}>
 <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
 <FormField
 control={form.control}
 name="clCode"
 render={({ field }) => (
 <FormItem>
 <FormLabel>분류코드</FormLabel>
 <FormControl>
 <Input placeholder="분류코드" {...field} readOnly={isEdit} />
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />
 <FormField
 control={form.control}
 name="clCodeNm"
 render={({ field }) => (
 <FormItem>
 <FormLabel>분류코드명</FormLabel>
 <FormControl>
 <Input placeholder="분류코드명" {...field} />
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />
 <FormField
 control={form.control}
 name="clCodeDc"
 render={({ field }) => (
 <FormItem>
 <FormLabel>설명</FormLabel>
 <FormControl>
 <Input placeholder="설명" {...field} />
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
 <FormLabel>사용여부</FormLabel>
 <Select onValueChange={field.onChange} defaultValue={field.value}>
 <FormControl>
 <SelectTrigger>
 <SelectValue placeholder="사용여부" />
 </SelectTrigger>
 </FormControl>
 <SelectContent>
 <SelectItem value="Y">사용 (Y)</SelectItem>
 <SelectItem value="N">미사용 (N)</SelectItem>
 </SelectContent>
 </Select>
 <FormMessage />
 </FormItem>
 )}
 />
 <DialogFooter>
 {isEdit && (
 <Button type="button" variant="destructive" onClick={handleDelete}>
 삭제
 </Button>
 )}
 <Button type="submit">저장</Button>
 </DialogFooter>
 </form>
 </Form>
 </DialogContent>
 </Dialog>
 );
}
