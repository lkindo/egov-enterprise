
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
import { CmmnCode } from '@/types/foundation/system';
import { codeAdminService } from '@/services/foundation/system/CodeAdminService';

const formSchema = z.object({
 codeId: z.string().min(1, { message: "코드ID명은 필수입니다." }),
 codeIdNm: z.string().min(1, { message: "분류코드는 필수입니다." }),
 codeIdDc: z.string().optional(),
 useAt: z.enum(['Y', 'N']),
 clCode: z.string().min(1, { message: "遺꾨쪟肄붾뱶님?꾩닔?낅땲님" }),
});

interface CommonCodeFormProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 data?: CmmnCode;
 onSuccess: () => void;
 clCodes: Array<{ label: string, value: string }>;
}

export function CommonCodeForm({ open, onOpenChange, data, onSuccess, clCodes }: CommonCodeFormProps) {
 const isEdit = !!data;
 const form = useForm<z.infer<typeof formSchema>>({
 resolver: zodResolver(formSchema),
 defaultValues: {
 codeId: data?.codeId || '',
 codeIdNm: data?.codeIdNm || '',
 codeIdDc: data?.codeIdDc || '',
 useAt: data?.useAt || 'Y',
 clCode: data?.clCode || '',
 },
 });

 const onSubmit = async (values: z.infer<typeof formSchema>) => {
 try {
 if (isEdit && data?.codeId) {
 await codeAdminService.updateCmmnCode(data.codeId, values as CmmnCode);
 } else {
 await codeAdminService.createCmmnCode(values as CmmnCode);
 }
 onSuccess();
 onOpenChange(false);
 } catch {
 console.error(error);
 alert('저장 중 오류가 발생했습니다.');
 }
 };

 const handleDelete = async () => {
 if (!data?.codeId) return;
 if (confirm('정말로 삭제하시겠습니까?')) {
 try {
 await codeAdminService.deleteCmmnCode(data.codeId);
 onSuccess();
 onOpenChange(false);
 } catch {
 console.error(error);
 alert('삭제 중 오류가 발생했습니다.');
 }
 }
 };

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="sm:max-w-[425px]">
 <DialogHeader>
 <DialogTitle>{isEdit ? '공통코드 수정' : '공통코드 등록'}</DialogTitle>
 <DialogDescription>
 怨듯넻肄붾뱶 ?뺣낫瑜{isEdit ? '?섏젙' : '?낅젰'}합니다
 </DialogDescription>
 </DialogHeader>
 <Form {...form}>
 <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
 <FormField
 control={form.control}
 name="clCode"
 render={({ field }) => (
 <FormItem>
 <FormLabel>遺꾨쪟肄붾뱶</FormLabel>
 <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isEdit}>
 <FormControl>
 <SelectTrigger>
 <SelectValue placeholder="분류코드 선택" />
 </SelectTrigger>
 </FormControl>
 <SelectContent>
 {clCodes.map((clCode) => (
 <SelectItem key={clCode.value} value={clCode.value}>
 {clCode.label}
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
 name="codeId"
 render={({ field }) => (
 <FormItem>
 <FormLabel>肄붾뱶ID</FormLabel>
 <FormControl>
 <Input placeholder="코드ID" {...field} readOnly={isEdit} />
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />
 <FormField
 control={form.control}
 name="codeIdNm"
 render={({ field }) => (
 <FormItem>
 <FormLabel>肄붾뱶ID紐</FormLabel>
 <FormControl>
 <Input placeholder="肄붾뱶ID紐 {...field} />
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />
 <FormField
 control={form.control}
 name="codeIdDc"
 render={({ field }) => (
 <FormItem>
 <FormLabel>설명</FormLabel>
 <FormControl>
 <Input placeholder="코드ID명" {...field} />
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
 <FormLabel>ъ슜여부</FormLabel>
 <Select onValueChange={field.onChange} defaultValue={field.value}>
 <FormControl>
 <SelectTrigger>
 <SelectValue placeholder="사용여부" />
 </SelectTrigger>
 </FormControl>
 <SelectContent>
 <SelectItem value="Y">ъ슜 (Y)</SelectItem>
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
 <Button type="submit">님/Button>
 </DialogFooter>
 </form>
 </Form>
 </DialogContent>
 </Dialog>
 );
}

