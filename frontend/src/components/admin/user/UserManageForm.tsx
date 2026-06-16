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

import { UserDtoSchema } from '@/types/generated-zod';

export const userSchema = UserDtoSchema.partial().extend({
  userId: z.string().min(1),
  userNm: z.string().min(1),
  emlAddr: z.string().optional().or(z.literal('')),
  mblTelno: z.string().optional().or(z.literal('')),
  ognzId: z.string().optional().or(z.literal('')),
  pswd: z.string().optional().or(z.literal('')),
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
      emlAddr: initialData?.emlAddr || '',
      mblTelno: initialData?.mblTelno || '',
      ognzId: initialData?.ognzId || '',
      pswd: '',
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
                  <FormLabel className="text-xs font-bold text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">
                    사용자 아이디 (Identity_ID) <span className="text-rose-500 font-bold text-xs">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      readOnly={mode === 'edit'}
                      className={cn(
                        "h-11 rounded-lg text-xs font-mono font-bold tracking-widest uppercase shadow-inner transition-all",
                        mode === 'edit' ? "bg-muted/50 border-none" : "focus:ring-4 focus:ring-primary/10",
                        fieldState.error && "border-rose-500 ring-rose-500/10 ring-4"
                      )}
                      placeholder="ID (MIN_1)"
                    />
                  </FormControl>
                  <FormMessage className="text-xs font-bold text-rose-500 mt-2 ml-2" />
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
                  <FormLabel className="text-xs font-bold text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">
                    사용자 성함 <span className="text-rose-500 font-bold text-xs">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className={cn(
                        "h-11 rounded-lg text-sm font-bold tracking-tight transition-all focus:ring-4 focus:ring-primary/10",
                        fieldState.error && "border-rose-500 ring-rose-500/10 ring-4"
                      )}
                      placeholder="NAME"
                    />
                  </FormControl>
                  <FormMessage className="text-xs font-bold text-rose-500 mt-2 ml-2" />
                </motion.div>
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FormField
            control={form.control}
            name="emlAddr"
            render={({ field, fieldState }) => (
              <FormItem>
                <motion.div
                  animate={fieldState.error ? { x: [0, -2, 2, -2, 2, 0] } : {}}
                  transition={{ duration: 0.4 }}
                >
                  <FormLabel className="text-xs font-bold text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">
                    이메일 주소
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className={cn(
                        "h-11 rounded-lg text-xs font-medium border-slate-100 shadow-sm transition-all focus:ring-4 focus:ring-primary/10",
                        fieldState.error && "border-rose-500 ring-rose-500/10 ring-4"
                      )}
                      placeholder="example@nuri.com"
                    />
                  </FormControl>
                  <FormMessage className="text-xs font-bold text-rose-500 mt-2 ml-2" />
                </motion.div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="mblTelno"
            render={({ field, fieldState }) => (
              <FormItem>
                <motion.div
                  animate={fieldState.error ? { x: [0, -2, 2, -2, 2, 0] } : {}}
                  transition={{ duration: 0.4 }}
                >
                  <FormLabel className="text-xs font-bold text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">
                    연락처
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className={cn(
                        "h-11 rounded-lg text-xs font-medium border-slate-100 shadow-sm transition-all focus:ring-4 focus:ring-primary/10",
                        fieldState.error && "border-rose-500 ring-rose-500/10 ring-4"
                      )}
                      placeholder="010-0000-0000"
                    />
                  </FormControl>
                  <FormMessage className="text-xs font-bold text-rose-500 mt-2 ml-2" />
                </motion.div>
              </FormItem>
            )}
          />
        </div>

        {mode === 'create' && (
          <FormField
            control={form.control}
            name="pswd"
            render={({ field, fieldState }) => (
              <FormItem>
                <motion.div
                  animate={fieldState.error ? { x: [0, -2, 2, -2, 2, 0] } : {}}
                  transition={{ duration: 0.4 }}
                >
                  <FormLabel className="text-xs font-bold text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">
                    초기 비밀번호 <span className="text-rose-500 font-bold text-xs">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      className={cn(
                        "h-11 rounded-lg text-xs border-slate-100 shadow-sm transition-all focus:ring-4 focus:ring-primary/10",
                        fieldState.error && "border-rose-500 ring-rose-500/10 ring-4"
                      )}
                      placeholder="PASSWORD (MIN_8)"
                    />
                  </FormControl>
                  <FormMessage className="text-xs font-bold text-rose-500 mt-2 ml-2" />
                </motion.div>
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="ognzId"
          render={({ field, fieldState }) => (
            <FormItem>
              <motion.div
                  animate={fieldState.error ? { x: [0, -2, 2, -2, 2, 0] } : {}}
                  transition={{ duration: 0.4 }}
              >
                <FormLabel className="text-xs font-bold text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">
                  소속 부서
                </FormLabel>
                <FormControl>
                  <select
                    {...field}
                    className={cn(
                        "w-full h-11 px-6 rounded-lg border-2 border-slate-100 bg-slate-50 text-xs font-bold outline-none shadow-inner transition-all",
                        fieldState.error ? "border-rose-500 ring-rose-500/10 ring-4" : "focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                    )}
                  >
                    <option value="">소속 없음 / GLOBAL</option>
                    {(departments || []).filter(Boolean).map((d: any) => (
                      <option key={d.ognzId} value={d.ognzId}>{d.ognzNm}</option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage className="text-xs font-bold text-rose-500 mt-2 ml-2" />
              </motion.div>
            </FormItem>
          )}
        />

        <div className="flex w-full gap-4 pt-4 border-t border-slate-100">
          <button 
            type="button" 
            onClick={onCancel} 
            className="flex-1 h-11 rounded-lg font-bold text-xs tracking-widest border border-slate-200 text-slate-600 bg-white hover:bg-slate-900 hover:text-white transition-all outline-none cursor-pointer flex items-center justify-center"
          >
            취소
          </button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-[2] h-11 rounded-lg font-bold text-xs tracking-widest shadow-xl bg-slate-900 text-white hover:bg-primary transition-all group"
          >
            <Zap size={18} className="group-hover:animate-pulse mr-2" />
            {mode === 'create' ? '신규 등록' : '정보 수정'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
