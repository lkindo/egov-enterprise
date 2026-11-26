'use client';

import React from 'react';
import { useAppForm } from '@/hooks/useAppForm';
import { useWatch } from 'react-hook-form';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormErrorSummary,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Button } from '@/components/ui/button';
import { UserManage } from '@/types/foundation/user';
import { Department } from '@/services/foundation/system/DeptAdminService';
import { cn } from '@/lib/utils';
import { Zap } from 'lucide-react';
import { motion } from 'framer-motion';

import { UserDtoSchema } from '@/types/generated-zod';

export const userSchema = UserDtoSchema.partial().extend({
  userId: UserDtoSchema.shape.userId,
  userNm: UserDtoSchema.shape.userNm,
  emlAddr: UserDtoSchema.shape.emlAddr,
  mblTelno: UserDtoSchema.shape.mblTelno,
  ognzId: UserDtoSchema.shape.ognzId,
  pswd: UserDtoSchema.shape.pswd.optional().or(z.literal('')),
});

export const createUserSchema = userSchema.extend({
  pswd: UserDtoSchema.shape.pswd,
});

export type UserFormValues = z.infer<typeof userSchema>;

const LOGIN_ID_CHECK_MESSAGES = {
  checking: '등록된 아이디를 확인하고 있습니다.',
  registered: '이미 등록된 아이디입니다.',
  unregistered: '등록된 계정이 없습니다. 등록 가능 여부는 저장할 때 확인합니다.',
  error: '아이디를 조회하지 못했습니다. 다시 확인하거나 등록을 시도하세요.',
};

interface UserManageFormProps {
  initialData?: Partial<UserManage>;
  mode: 'create' | 'edit';
  departments: Department[];
  onSubmit: (data: UserFormValues) => Promise<void>;
  onCancel: () => void;
  onCheckLoginId?: (userId: string) => Promise<boolean>;
  isPending?: boolean;
  externalBusy?: boolean;
  /** 수정에서 소속 부서를 바꾸려면 '사용자 · 부서 변경'(USER_DEPT)이 필요하다 — 서버가 같은 권한을 다시 확인한다. */
  canChangeDepartment?: boolean;
}

export function UserManageForm({
  initialData,
  mode,
  departments,
  onSubmit,
  onCancel,
  onCheckLoginId,
  isPending = false,
  externalBusy = false,
  canChangeDepartment = true,
}: UserManageFormProps) {
  const departmentLocked = mode === 'edit' && !canChangeDepartment;
  const schema = React.useMemo(() => {
    return mode === 'create' ? createUserSchema : userSchema;
  }, [mode]);

  const form = useAppForm(schema, {
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
  const isWritePending = isSubmitting || isPending;
  const areActionsDisabled = isWritePending || externalBusy;
  const loginId = useWatch({ control: form.control, name: 'userId' });
  const [loginIdCheck, setLoginIdCheck] = React.useState<{ id: string; status: keyof typeof LOGIN_ID_CHECK_MESSAGES } | null>(null);
  const isCheckingLoginId = loginIdCheck?.status === 'checking';
  const checkedStatus = loginIdCheck?.id === loginId ? loginIdCheck?.status : undefined;
  const canCheckLoginId = !areActionsDisabled && !isCheckingLoginId && UserDtoSchema.shape.userId.safeParse(loginId).success;

  const handleCheckLoginId = async () => {
    if (!onCheckLoginId || !canCheckLoginId) return;
    setLoginIdCheck({ id: loginId, status: 'checking' });
    try {
      const exists = await onCheckLoginId(loginId);
      setLoginIdCheck({ id: loginId, status: exists ? 'registered' : 'unregistered' });
    } catch {
      setLoginIdCheck({ id: loginId, status: 'error' });
    }
  };

  const handleSubmit = async (values: UserFormValues) => {
    if (isPending || externalBusy) return;
    try {
      await onSubmit(values);
    } catch (error) {
      if (!form.applyServerErrors(error)) throw error;
    }
  };

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={(event) => {
          if (isPending || externalBusy) {
            event.preventDefault();
            return;
          }
          void form.handleSubmit(handleSubmit)(event);
        }}
        className="space-y-8 pt-4 text-left"
      >
        <FormErrorSummary
          labels={{
            userId: '사용자 아이디',
            userNm: '사용자 성함',
            emlAddr: '이메일 주소',
            mblTelno: '연락처',
            pswd: '초기 비밀번호',
            ognzId: '소속 부서',
          }}
          onNavigate={form.focusError}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FormField
            control={form.control}
            name="userId"
            required
            render={({ field, fieldState }) => (
              <FormItem>
                <motion.div
                  animate={fieldState.error ? { x: [0, -2, 2, -2, 2, 0] } : undefined}
                  transition={{ duration: 0.4 }}
                >
                  <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1">
                    사용자 아이디
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      readOnly={mode === 'edit'}
                      maxLength={20}
                      className={cn(
                        "rounded-lg text-xs font-mono font-bold shadow-inner transition-all",
                        mode === 'edit' ? "bg-muted/50 border-none" : "focus:ring-4 focus:ring-primary/10",
                        fieldState.error && "border-destructive-emphasis ring-destructive/10 ring-4"
                      )}
                      placeholder="ID (4-20, 영문/숫자/_)"
                    />
                  </FormControl>
                  <FormMessage className="text-xs font-bold text-destructive-emphasis mt-2 ml-2" />
                  {mode === 'create' && onCheckLoginId && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Button type="button" size="sm" variant="outline" disabled={!canCheckLoginId}
                        aria-busy={isCheckingLoginId} onClick={() => void handleCheckLoginId()}>
                        중복 확인
                      </Button>
                      <p role="status" className="text-xs text-muted-foreground">
                        {checkedStatus && LOGIN_ID_CHECK_MESSAGES[checkedStatus]}
                      </p>
                    </div>
                  )}
                </motion.div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="userNm"
            required
            render={({ field, fieldState }) => (
              <FormItem>
                <motion.div
                  animate={fieldState.error ? { x: [0, -2, 2, -2, 2, 0] } : undefined}
                  transition={{ duration: 0.4 }}
                >
                  <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1">
                    사용자 성함
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      maxLength={50}
                      className={cn(
                        "rounded-lg text-sm font-bold tracking-tight transition-all focus:ring-4 focus:ring-primary/10",
                        fieldState.error && "border-destructive-emphasis ring-destructive/10 ring-4"
                      )}
                      placeholder="예: 홍길동"
                    />
                  </FormControl>
                  <FormMessage className="text-xs font-bold text-destructive-emphasis mt-2 ml-2" />
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
                  animate={fieldState.error ? { x: [0, -2, 2, -2, 2, 0] } : undefined}
                  transition={{ duration: 0.4 }}
                >
                  <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1">
                    이메일 주소
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      maxLength={50}
                      className={cn(
                        "rounded-lg text-xs font-medium border-input shadow-sm transition-all focus:ring-4 focus:ring-primary/10",
                        fieldState.error && "border-destructive-emphasis ring-destructive/10 ring-4"
                      )}
                      placeholder="example@nuri.com"
                    />
                  </FormControl>
                  <FormMessage className="text-xs font-bold text-destructive-emphasis mt-2 ml-2" />
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
                  animate={fieldState.error ? { x: [0, -2, 2, -2, 2, 0] } : undefined}
                  transition={{ duration: 0.4 }}
                >
                  <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1">
                    연락처
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      maxLength={11}
                      inputMode="tel"
                      className={cn(
                        "rounded-lg text-xs font-medium border-input shadow-sm transition-all focus:ring-4 focus:ring-primary/10",
                        fieldState.error && "border-destructive-emphasis ring-destructive/10 ring-4"
                      )}
                      placeholder="010-0000-0000"
                    />
                  </FormControl>
                  <FormMessage className="text-xs font-bold text-destructive-emphasis mt-2 ml-2" />
                </motion.div>
              </FormItem>
            )}
          />
        </div>

        {mode === 'create' && (
          <FormField
            control={form.control}
            name="pswd"
            required
            render={({ field, fieldState }) => (
              <FormItem>
                <motion.div
                  animate={fieldState.error ? { x: [0, -2, 2, -2, 2, 0] } : undefined}
                  transition={{ duration: 0.4 }}
                >
                  <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1">
                    초기 비밀번호
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      maxLength={100}
                      className={cn(
                        "rounded-lg text-xs border-input shadow-sm transition-all focus:ring-4 focus:ring-primary/10",
                        fieldState.error && "border-destructive-emphasis ring-destructive/10 ring-4"
                      )}
                      placeholder="영문·숫자·특수문자 포함 8~64자"
                    />
                  </FormControl>
                  <FormMessage className="text-xs font-bold text-destructive-emphasis mt-2 ml-2" />
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
                  animate={fieldState.error ? { x: [0, -2, 2, -2, 2, 0] } : undefined}
                  transition={{ duration: 0.4 }}
              >
                <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1">
                  소속 부서
                </FormLabel>
                <FormControl>
                  <NativeSelect
                    {...field}
                    disabled={departmentLocked}
                    aria-describedby={departmentLocked ? 'user-form-dept-locked' : undefined}
                    className={cn(
                        "w-full px-6 rounded-lg border-2 bg-muted text-xs font-bold shadow-inner transition-all",
                        fieldState.error ? "border-destructive-emphasis ring-destructive/10 ring-4" : "focus:border-ring focus:ring-4 focus:ring-primary/10"
                    )}
                  >
                    {/* 'GLOBAL' 은 내부 구현 용어라 화면에 두지 않는다(헌법 제16조 4항).
                        e2e(02-admin-system)는 이 항목을 텍스트가 아니라 index 0 으로 고른다. */}
                    <option value="">소속 없음</option>
                    {(departments || []).filter(Boolean).map((d) => (
                      <option key={d.ognzId} value={d.ognzId}>{d.ognzNm}</option>
                    ))}
                  </NativeSelect>
                </FormControl>
                {departmentLocked && (
                  <p id="user-form-dept-locked" className="text-xs text-muted-foreground mt-2 ml-2">
                    소속 부서는 부서 변경 권한이 있어야 바꿀 수 있어요.
                  </p>
                )}
                <FormMessage className="text-xs font-bold text-destructive-emphasis mt-2 ml-2" />
              </motion.div>
            </FormItem>
          )}
        />

        <div className="flex w-full gap-4 pt-4 border-t border-border">
          <button 
            type="button" 
            disabled={areActionsDisabled}
            onClick={() => {
              if (!areActionsDisabled) onCancel();
            }}
            className="flex-1 h-[var(--control-h)] rounded-lg font-bold text-xs border border-border text-muted-foreground bg-card hover:bg-surface-inverse hover:text-surface-inverse-foreground transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring cursor-pointer flex items-center justify-center"
          >
            취소
          </button>
          <Button
            type="submit"
            disabled={areActionsDisabled}
            aria-busy={isWritePending || undefined}
            className="flex-[2] rounded-lg font-bold text-xs tracking-widest shadow-xl bg-surface-inverse text-surface-inverse-foreground hover:bg-primary transition-all group"
          >
            <Zap size={18} className="group-hover:animate-pulse mr-2" />
            {isWritePending ? (mode === 'create' ? '사용자 등록 중…' : '사용자 수정 중…') : mode === 'create' ? '신규 등록' : '정보 수정'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
