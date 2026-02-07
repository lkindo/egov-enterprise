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
import { ProgrmManage } from "@/types/system";
import { createProgram, updateProgram, deleteProgram } from '@/services/system/programService';

const formSchema = z.object({
    progrmFileNm: z.string().min(1, { message: "프로그램파일명은 필수입니다." }),
    progrmStrePath: z.string().min(1, { message: "저장경로는 필수입니다." }),
    progrmKoreanNm: z.string().min(1, { message: "프로그램한글명은 필수입니다." }),
    progrmDc: z.string().optional(),
    url: z.string().min(1, { message: "URL은 필수입니다." }),
});

interface ProgramFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    data?: ProgrmManage;
    onSuccess: () => void;
}

export function ProgramForm({ open, onOpenChange, data, onSuccess }: ProgramFormProps) {
    const isEdit = !!data;
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            progrmFileNm: data?.progrmFileNm || '',
            progrmStrePath: data?.progrmStrePath || '/',
            progrmKoreanNm: data?.progrmKoreanNm || '',
            progrmDc: data?.progrmDc || '',
            url: data?.url || '/',
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            if (isEdit) {
                await updateProgram(values as ProgrmManage);
            } else {
                await createProgram(values as ProgrmManage);
            }
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            alert('저장 중 오류가 발생했습니다.');
        }
    };

    const handleDelete = async () => {
        if (!data?.progrmFileNm) return;
        if (confirm('정말로 삭제하시겠습니까?')) {
            try {
                await deleteProgram(data.progrmFileNm);
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
                    <DialogTitle>{isEdit ? '프로그램 수정' : '프로그램 등록'}</DialogTitle>
                    <DialogDescription>
                        프로그램 정보를 {isEdit ? '수정' : '입력'}합니다.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="progrmFileNm"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>프로그램파일명</FormLabel>
                                    <FormControl>
                                        <Input placeholder="프로그램파일명" {...field} readOnly={isEdit} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="progrmKoreanNm"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>프로그램명</FormLabel>
                                    <FormControl>
                                        <Input placeholder="프로그램명" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="url"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>URL</FormLabel>
                                    <FormControl>
                                        <Input placeholder="URL" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="progrmStrePath"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>저장경로</FormLabel>
                                    <FormControl>
                                        <Input placeholder="저장경로" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="progrmDc"
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
