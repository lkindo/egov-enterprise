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
import { MenuManage } from "@/types/system";
import { menuAdminService } from '@/services/admin/system/MenuAdminService';

const formSchema = z.object({
    menuNo: z.coerce.number().min(1, { message: "메뉴번호는 필수입니다." }),
    menuNm: z.string().min(1, { message: "메뉴명은 필수입니다." }),
    progrmFileNm: z.string().min(1, { message: "프로그램파일명은 필수입니다." }),
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
    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            menuNo: data?.menuNo ? String(data.menuNo) : '0',
            menuNm: data?.menuNm || '',
            progrmFileNm: data?.progrmFileNm || '',
            menuOrdr: data?.menuOrdr ? String(data.menuOrdr) : '1',
            menuDc: data?.menuDc || '',
            upperMenuId: data?.upperMenuId ? String(data.upperMenuId) : '0',
            relateImageNm: data?.relateImageNm || '/',
            relateImagePath: data?.relateImagePath || '/',
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            if (isEdit) {
                await menuAdminService.updateMenu(data.menuNo!, { ...values, menuNo: data.menuNo } as MenuManage);
            } else {
                await menuAdminService.createMenu(values as MenuManage);
            }
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            alert('저장 중 오류가 발생했습니다.');
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
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? '메뉴 수정' : '메뉴 등록'}</DialogTitle>
                    <DialogDescription>
                        메뉴 정보를 {isEdit ? '수정' : '입력'}합니다.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="menuNo"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>메뉴번호</FormLabel>
                                    <FormControl>
                                        <Input inputMode="numeric" placeholder="메뉴번호" {...(field as any)} readOnly={isEdit} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="menuNm"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>메뉴명</FormLabel>
                                    <FormControl>
                                        <Input placeholder="메뉴명" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="progrmFileNm"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>프로그램파일명</FormLabel>
                                    <FormControl>
                                        <Input placeholder="프로그램파일명" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="menuOrdr"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>순서</FormLabel>
                                    <FormControl>
                                        <Input inputMode="numeric" placeholder="순서" {...(field as any)} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="upperMenuId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>상위메뉴번호</FormLabel>
                                    <FormControl>
                                        <Input inputMode="numeric" placeholder="상위메뉴번호" {...(field as any)} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="menuDc"
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
