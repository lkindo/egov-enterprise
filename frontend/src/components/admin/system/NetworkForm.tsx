'use client';

import React from 'react';
import { useAppForm } from '@/hooks/useAppForm';
import { commonSchemas } from '@/lib/validations/common';
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
import { NetworkInfo } from '@/services/foundation/system/networkService';

const networkSchema = z.object({
  manageIem: commonSchemas.requiredString("관리항목"),
  userNm: commonSchemas.requiredString("사용자명"),
  ntwrkIp: z.string().regex(/^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}$/, "올바른 IPv4 주소를 입력하세요."),
  subnet: z.string().min(1, "서브넷 마스크는 필수입니다."),
  gtwy: z.string().min(1, "게이트웨이는 필수입니다."),
  domnServer: z.string().optional(),
  useAt: z.enum(['Y', 'N']),
});

type NetworkFormValues = z.infer<typeof networkSchema>;

interface NetworkFormProps {
    initialData?: Partial<NetworkInfo>;
    onSubmit: (data: NetworkFormValues) => Promise<void>;
    onCancel: () => void;
}

export function NetworkForm({ initialData, onSubmit, onCancel }: NetworkFormProps) {
    const form = useAppForm(networkSchema, {
        defaultValues: {
            manageIem: initialData?.manageIem || '',
            ntwrkIp: initialData?.ntwrkIp || '',
            subnet: initialData?.subnet || '',
            gtwy: initialData?.gtwy || '',
            domnServer: initialData?.domnServer || '',
            userNm: initialData?.userNm || '',
            useAt: initialData?.useAt || 'Y',
        },
    });

    const { isSubmitting } = form.formState;

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="manageIem"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>관리항목 <span className="text-destructive">*</span></FormLabel>
                                <FormControl>
                                    <Input {...field} placeholder="예: 내부망 서버" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="userNm"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>사용자명 <span className="text-destructive">*</span></FormLabel>
                                <FormControl>
                                    <Input {...field} placeholder="관리자 성명" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="ntwrkIp"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>IP 주소 <span className="text-destructive">*</span></FormLabel>
                                <FormControl>
                                    <Input {...field} placeholder="192.168.0.1" className="font-mono" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="subnet"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>서브넷 마스크 <span className="text-destructive">*</span></FormLabel>
                                <FormControl>
                                    <Input {...field} placeholder="255.255.255.0" className="font-mono" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="gtwy"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>게이트웨이 <span className="text-destructive">*</span></FormLabel>
                                <FormControl>
                                    <Input {...field} placeholder="192.168.0.254" className="font-mono" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="domnServer"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>DNS 서버</FormLabel>
                                <FormControl>
                                    <Input {...field} placeholder="8.8.8.8" className="font-mono" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <FormField
                    control={form.control}
                    name="useAt"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>사용 여부 <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                                <select
                                    {...field}
                                    className="w-full h-10 px-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                    <option value="Y">사용 중</option>
                                    <option value="N">미사용</option>
                                </select>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end gap-2 pt-4">
                    <button 
                      type="button" 
                      onClick={onCancel} 
                      className="px-6 h-10 rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-900 hover:text-white transition-all outline-none cursor-pointer flex items-center justify-center text-sm font-medium"
                    >
                      취소
                    </button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? '저장 중...' : '저장하기'}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
