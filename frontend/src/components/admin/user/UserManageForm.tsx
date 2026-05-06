'use client';

import React from 'react';
import { useAppForm } from '@/hooks/useAppForm';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserManage } from '@/types/foundation/user';
import { Department } from '@/services/foundation/system/DeptAdminService';
import { cn } from '@/lib/utils';
import { Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export const userSchema = z.object({
  userId: z.string().min(1, '아이디는 필수입니다.').max(20, '아이디는 20자 이내여야 합니다.'),
  userNm: z.string().min(1, '이름은 필수입니다.').max(30, '이름은 30자 이내여야 합니다.'),
  emailAdres: z.string().email('유효한 이메일 형식이 아닙니다.').optional().or(z.literal('')),
  moblphonNo: z.string().optional().or(z.literal('')),
  orgnztId: z.string().optional().or(z.literal('')),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.').optional().or(z.literal('')),
});

export type UserFormValues = z.infer<typeof userSchema>;

interface UserManageFormProps {
  initialData?: Partial<UserManage>;
  mode: 'create' | 'edit';
  departments: Department[];
  onSubmit: (data: UserFormValues) => Promise<void>;
  onCancel: () => void;
}

export function UserManageForm({ initialData, mode, departments, onSubmit, onCancel }: UserManageFormProps) {
  const form = useAppForm(userSchema, {
    defaultValues: {
      userId: initialData?.userId || '',
      userNm: initialData?.userNm || '',
      emailAdres: initialData?.emailAdres || '',
      moblphonNo: initialData?.moblphonNo || '',
      orgnztId: initialData?.orgnztId || '',
      password: '',
    },
  });

  const { isSubmitting } = form.formState;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pt-4 text-left">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FormField
            control={form.control}
            name="userId"
            render={({ field, fieldState }) => (
              <FormItem>
                <motion.div
                  animate={fieldState.error ? { x: [0, -2, 2, -2, 2, 0] } : {}}
                  transition={{ duration: 0.4 }}
                >
                  <FormLabel className="text-[11px] font-black text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">
                    사용자 아이디 (Identity_ID) <span className="text-rose-500 font-extrabold text-[10px]">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      readOnly={mode === 'edit'}
                      className={cn(
                        "h-14 rounded-xl text-xs font-mono font-black tracking-widest uppercase shadow-inner transition-all",
                        mode === 'edit' ? "bg-muted/50 border-none" : "focus:ring-4 focus:ring-primary/10",
                        fieldState.error && "border-rose-500 ring-rose-500/10 ring-4"
                      )}
                      placeholder="ID (MIN_1)"
                    />
                  </FormControl>
                  <FormMessage className="text-[10px] font-bold text-rose-500 mt-2 ml-2" />
                </motion.div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="userNm"
            render={({ field, fieldState }) => (
              <FormItem>
                <motion.div
                  animate={fieldState.error ? { x: [0, -2, 2, -2, 2, 0] } : {}}
                  transition={{ duration: 0.4 }}
                >
                  <FormLabel className="text-[11px] font-black text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">
                    사용자 성함 <span className="text-rose-500 font-extrabold text-[10px]">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className={cn(
                        "h-14 rounded-xl text-sm font-black tracking-tight transition-all focus:ring-4 focus:ring-primary/10",
                        fieldState.error && "border-rose-500 ring-rose-500/10 ring-4"
                      )}
                      placeholder="NAME"
                    />
                  </FormControl>
                  <FormMessage className="text-[10px] font-bold text-rose-500 mt-2 ml-2" />
                </motion.div>
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FormField
            control={form.control}
            name="emailAdres"
            render={({ field, fieldState }) => (
              <FormItem>
                <motion.div
                  animate={fieldState.error ? { x: [0, -2, 2, -2, 2, 0] } : {}}
                  transition={{ duration: 0.4 }}
                >
                  <FormLabel className="text-[11px] font-black text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">
                    이메일 주소
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className={cn(
                        "h-14 rounded-xl text-xs font-medium border-slate-100 shadow-sm transition-all focus:ring-4 focus:ring-primary/10",
                        fieldState.error && "border-rose-500 ring-rose-500/10 ring-4"
                      )}
                      placeholder="example@nuri.com"
                    />
                  </FormControl>
                  <FormMessage className="text-[10px] font-bold text-rose-500 mt-2 ml-2" />
                </motion.div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="moblphonNo"
            render={({ field, fieldState }) => (
              <FormItem>
                <motion.div
                  animate={fieldState.error ? { x: [0, -2, 2, -2, 2, 0] } : {}}
                  transition={{ duration: 0.4 }}
                >
                  <FormLabel className="text-[11px] font-black text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">
                    연락처
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className={cn(
                        "h-14 rounded-xl text-xs font-medium border-slate-100 shadow-sm transition-all focus:ring-4 focus:ring-primary/10",
                        fieldState.error && "border-rose-500 ring-rose-500/10 ring-4"
                      )}
                      placeholder="010-0000-0000"
                    />
                  </FormControl>
                  <FormMessage className="text-[10px] font-bold text-rose-500 mt-2 ml-2" />
                </motion.div>
              </FormItem>
            )}
          />
        </div>

        {mode === 'create' && (
          <FormField
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <FormItem>
                <motion.div
                  animate={fieldState.error ? { x: [0, -2, 2, -2, 2, 0] } : {}}
                  transition={{ duration: 0.4 }}
                >
                  <FormLabel className="text-[11px] font-black text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">
                    초기 비밀번호 <span className="text-rose-500 font-extrabold text-[10px]">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      className={cn(
                        "h-14 rounded-xl text-xs border-slate-100 shadow-sm transition-all focus:ring-4 focus:ring-primary/10",
                        fieldState.error && "border-rose-500 ring-rose-500/10 ring-4"
                      )}
                      placeholder="PASSWORD (MIN_8)"
                    />
                  </FormControl>
                  <FormMessage className="text-[10px] font-bold text-rose-500 mt-2 ml-2" />
                </motion.div>
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="orgnztId"
          render={({ field, fieldState }) => (
            <FormItem>
              <motion.div
                  animate={fieldState.error ? { x: [0, -2, 2, -2, 2, 0] } : {}}
                  transition={{ duration: 0.4 }}
              >
                <FormLabel className="text-[11px] font-black text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">
                  소속 부서
                </FormLabel>
                <FormControl>
                  <select
                    {...field}
                    className={cn(
                        "w-full h-14 px-6 rounded-xl border-2 border-slate-100 bg-slate-50 text-xs font-bold outline-none shadow-inner transition-all",
                        fieldState.error ? "border-rose-500 ring-rose-500/10 ring-4" : "focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                    )}
                  >
                    <option value="">소속 없음 / GLOBAL</option>
                    {(departments || []).filter(Boolean).map((d: any) => (
                      <option key={d.orgnztId} value={d.orgnztId}>{d.orgnztNm}</option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage className="text-[10px] font-bold text-rose-500 mt-2 ml-2" />
              </motion.div>
            </FormItem>
          )}
        />

        <div className="flex w-full gap-4 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1 h-14 rounded-xl font-black text-[10px] tracking-widest uppercase border-2">취소</Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-[2] h-14 rounded-xl font-black text-[10px] tracking-widest shadow-xl bg-slate-900 text-white hover:bg-primary transition-all group"
          >
            <Zap size={18} className="group-hover:animate-pulse mr-2" />
            {mode === 'create' ? '신규 등록' : '정보 수정'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
