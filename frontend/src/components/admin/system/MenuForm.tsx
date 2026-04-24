'use client';

import { useAppForm } from '@/hooks/useAppForm';
import { commonSchemas } from '@/lib/validations/common';
import { toast } from 'sonner';
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
  Settings2, 
  Layers, 
  FileText, 
  Plus, 
  Pencil, 
  Save, 
  Hash,
  Type,
  ChevronRight,
  Trash2
} from 'lucide-react';
import { MenuManage } from '@/types/foundation/system';
import { menuAdminService } from '@/services/foundation/system/MenuAdminService';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  menuNo: z.coerce.number().min(1, { message: "메뉴번호는 필수입니다." }),
  menuNm: commonSchemas.requiredString("메뉴명"),
  progrmFileNm: commonSchemas.requiredString("프로그램파일명"),
  menuOrdr: z.coerce.number().min(1, { message: "메뉴순서는 필수입니다." }),
  menuDc: z.string().optional(),
  upperMenuId: z.coerce.number().optional(),
  relateImageNm: z.string().optional(),
  relateImagePath: z.string().optional(),
});

interface MenuFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data?: MenuManage;
  onSuccess: () => void;
}

export function MenuForm({ open, onOpenChange, data, onSuccess }: MenuFormProps) {
  const isEdit = !!data;
  const form = useAppForm(formSchema, {
    defaultValues: {
      menuNo: data?.menuNo || 0,
      menuNm: data?.menuNm || '',
      progrmFileNm: data?.progrmFileNm || '',
      menuOrdr: data?.menuOrdr || 1,
      menuDc: data?.menuDc || '',
      upperMenuId: data?.upperMenuId || 0,
      relateImageNm: data?.relateImageNm || '/',
      relateImagePath: data?.relateImagePath || '/',
    },
  });

  const onSubmit = async (values: any) => {
    try {
      const payload = { 
        ...values, 
        menuNo: Number(values.menuNo),
        menuOrdr: Number(values.menuOrdr),
        upperMenuId: Number(values.upperMenuId)
      };
      if (isEdit) {
        await menuAdminService.updateMenu(data.menuNo!, { ...payload, menuNo: data.menuNo } as MenuManage);
        toast.success('메뉴 정보가 수정되었습니다.');
      } else {
        await menuAdminService.createMenu(payload as MenuManage);
        toast.success('신규 메뉴가 등록되었습니다.');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      // useAppForm handles validation errors; here we handle submission (server) errors
      toast.error('저장 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async () => {
    if (!data?.menuNo) return;
    if (confirm('정말로 삭제하시겠습니까?')) {
      try {
        await menuAdminService.deleteMenu(data.menuNo);
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
      <DialogContent className={cn("sm:max-w-[500px] rounded-[0.1rem] p-10 border-none shadow-2xl bg-white ring-1 ring-slate-100")}>
        <DialogHeader className="space-y-4">
          <div className="w-16 h-16 bg-primary text-white rounded-[0.1rem] flex items-center justify-center shadow-2xl shadow-primary/20 mx-auto">
            {isEdit ? <Pencil size={28} /> : <Plus size={28} />}
          </div>
          <DialogTitle className="text-3xl font-black text-slate-900 tracking-tighter text-center">
            {isEdit ? '메뉴 프로필 수정' : '신규 메뉴 아키텍처 등록'}
          </DialogTitle>
          <DialogDescription className="text-center font-bold text-slate-400 text-sm">
            시스템 네비게이션 구조를 위한 {isEdit ? '기존 메뉴 정보를 수정' : '새로운 메뉴 노드를 정의'}합니다
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 py-6">
            <div className="grid grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="menuNo"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-[10px] font-black text-slate-400 tracking-tight ml-2 flex items-center gap-2">
                      <Hash size={12} className="text-primary" /> 메뉴 번호
                    </FormLabel>
                    <FormControl>
                      <Input 
                        inputMode="numeric" 
                        placeholder="메뉴번호" 
                        {...field} 
                        value={String(field.value)}
                        readOnly={isEdit} 
                        className="h-14 px-6 rounded-[0.1rem] border-2 border-slate-100 bg-slate-50/50 font-black text-sm focus:bg-white transition-all shadow-inner"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="menuOrdr"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-[10px] font-black text-slate-400 tracking-tight ml-2 flex items-center gap-2">
                      <Layers size={12} className="text-primary" /> 출력 순서
                    </FormLabel>
                    <FormControl>
                      <Input 
                        inputMode="numeric" 
                        placeholder="순서" 
                        {...field} 
                        value={String(field.value)}
                        className="h-14 px-6 rounded-[0.1rem] border-2 border-slate-100 bg-slate-50/50 font-black text-sm focus:bg-white transition-all shadow-inner"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="menuNm"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-[10px] font-black text-slate-400 tracking-tight ml-2 flex items-center gap-2">
                    <Type size={12} className="text-primary" /> 메뉴 명칭
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="메뉴명" 
                      {...field} 
                      className="h-16 px-8 rounded-[0.1rem] border-2 border-slate-100 bg-slate-50/50 text-lg font-black focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="progrmFileNm"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-[10px] font-black text-slate-400 tracking-tight ml-2 flex items-center gap-2">
                      <FileText size={12} className="text-primary" /> 연결 프로그램
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="프로그램파일명" 
                        {...field} 
                        className="h-14 px-6 rounded-[0.1rem] border-2 border-slate-100 bg-slate-50/50 font-bold text-sm focus:bg-white transition-all shadow-inner"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="upperMenuId"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-[10px] font-black text-slate-400 tracking-tight ml-2 flex items-center gap-2">
                      <ChevronRight size={12} className="text-primary" /> 상위 노드 ID
                    </FormLabel>
                    <FormControl>
                      <Input 
                        inputMode="numeric" 
                        placeholder="상위메뉴번호" 
                        {...field} 
                        value={String(field.value)}
                        className="h-14 px-6 rounded-[0.1rem] border-2 border-slate-100 bg-slate-50/50 font-black text-sm focus:bg-white transition-all shadow-inner"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="menuDc"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-[10px] font-black text-slate-400 tracking-tight ml-2 flex items-center gap-2">
                    <Settings2 size={12} className="text-primary" /> 상세 설명
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="설명" 
                      {...field} 
                      className="h-14 px-6 rounded-[0.1rem] border-2 border-slate-100 bg-slate-50/50 font-bold text-sm focus:bg-white transition-all shadow-inner"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-6 gap-3 sm:justify-between">
              <div className="flex gap-3 flex-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="h-16 px-10 rounded-[0.1rem] border-2 border-slate-100 font-black text-sm tracking-tight hover:bg-slate-50 transition-all flex-1"
                >
                  취소
                </Button>
                <Button 
                  type="submit"
                  className="h-16 px-14 bg-slate-900 text-white rounded-[0.1rem] font-black text-sm tracking-[0.2em] shadow-xl hover:bg-primary transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3 flex-[2]"
                >
                  <Save size={18} />
                  데이터 저장
                </Button>
              </div>
              {isEdit && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={handleDelete}
                  className="h-16 w-16 rounded-[0.1rem] text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all shadow-sm"
                >
                  <Trash2 size={24} />
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
