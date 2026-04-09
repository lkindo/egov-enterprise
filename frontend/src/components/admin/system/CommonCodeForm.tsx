'use client';

import { useAppForm } from '@/hooks/useAppForm';
import { commonSchemas } from '@/lib/validations/common';
import { toast } from 'sonner';
import { Pencil, Plus, Save, Hash, Type, Code2, CheckCircle2 } from 'lucide-react';
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
import { CmmnCode } from '@/types/foundation/system';
import { codeAdminService } from '@/services/foundation/system/CodeAdminService';

const formSchema = z.object({
  codeId: commonSchemas.code,
  codeIdNm: commonSchemas.requiredString("코드ID명"),
  codeIdDc: z.string().optional(),
  useAt: commonSchemas.useAt,
  clCode: z.string().min(1, { message: "분류코드는 필수입니다." }),
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
  const form = useAppForm(formSchema, {
    defaultValues: {
      codeId: data?.codeId || '',
      codeIdNm: data?.codeIdNm || '',
      codeIdDc: data?.codeIdDc || '',
      useAt: (data?.useAt as 'Y' | 'N') || 'Y',
      clCode: data?.clCode || '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (isEdit && data?.codeId) {
        await codeAdminService.updateCmmnCode(data.codeId, values as CmmnCode);
        toast.success('공통코드 정보가 수정되었습니다.');
      } else {
        await codeAdminService.createCmmnCode(values as CmmnCode);
        toast.success('신규 공통코드가 등록되었습니다.');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('저장 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async () => {
    if (!data?.codeId) return;
    if (confirm('정말로 삭제하시겠습니까?')) {
      try {
        await codeAdminService.deleteCmmnCode(data.codeId);
        toast.success('공통코드가 삭제되었습니다.');
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
          <DialogTitle>{isEdit ? '공통코드 수정' : '공통코드 등록'}</DialogTitle>
          <DialogDescription>
            공통코드 정보를 {isEdit ? '수정' : '입력'}합니다
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
                  <FormLabel>코드ID</FormLabel>
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
                  <FormLabel>코드ID명</FormLabel>
                  <FormControl>
                    <Input placeholder="코드ID명" {...field} />
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
