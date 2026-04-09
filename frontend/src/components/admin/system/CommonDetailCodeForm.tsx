'use client';

import { useAppForm } from '@/hooks/useAppForm';
import { commonSchemas } from '@/lib/validations/common';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
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
  codeId: commonSchemas.code,
  code: commonSchemas.code,
  codeNm: commonSchemas.requiredString("상세코드명"),
  codeDc: z.string().optional(),
  useAt: commonSchemas.useAt,
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
  const form = useAppForm(formSchema, {
    defaultValues: {
      codeId: data?.codeId || '',
      code: data?.code || '',
      codeNm: data?.codeNm || '',
      codeDc: data?.codeDc || '',
      useAt: (data?.useAt as 'Y' | 'N') || 'Y',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (isEdit) {
        await codeAdminService.updateDetailCode(values.codeId, values.code, values as CmmnDetailCode);
        toast.success('공통상세코드 정보가 수정되었습니다.');
      } else {
        await codeAdminService.createDetailCode(values as CmmnDetailCode);
        toast.success('신규 공통상세코드가 등록되었습니다.');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('저장 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async () => {
    if (!data?.codeId || !data?.code) return;
    if (confirm('정말로 삭제하시겠습니까?')) {
      try {
        await codeAdminService.deleteDetailCode(data.codeId, data.code);
        toast.success('공통상세코드가 삭제되었습니다.');
        onSuccess();
        onOpenChange(false);
      } catch (error) {
        console.error(error);
        toast.error('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? '공통상세코드 수정' : '공통상세코드 등록'}</DialogTitle>
          <DialogDescription>
            공통상세코드 정보를 {isEdit ? '수정' : '입력'}합니다
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="codeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>코드ID</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isEdit}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="코드ID 선택" />
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
                  <FormLabel>상세코드</FormLabel>
                  <FormControl>
                    <Input placeholder="상세코드" {...field} readOnly={isEdit} />
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
                  <FormLabel>상세코드명</FormLabel>
                  <FormControl>
                    <Input placeholder="상세코드명" {...field} />
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
            <DialogFooter className="gap-2 sm:gap-0">
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
