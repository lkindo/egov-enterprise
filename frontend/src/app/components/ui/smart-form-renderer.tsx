'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { FormField, FormSchema } from './smart-form-builder';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField as UIFormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface SmartFormRendererProps {
    schema: FormSchema;
    onSubmit: (data: unknown) => void;
    className?: string;
}

export function SmartFormRenderer({ schema, onSubmit, className }: SmartFormRendererProps) {
    // Generate dynamic Zod schema based on fields
    const formValues: Record<string, z.ZodTypeAny> = {};
    schema.fields.forEach(field => {
        let rule: z.ZodTypeAny = z.string();
        if (field.type === 'number') rule = z.number();
        if (field.required) {
            if (field.type === 'checkbox') rule = z.boolean().refine(v => v === true, { message: "필수 동의 항목입니다" });
            else rule = (rule as z.ZodString).min(1, { message: `${field.label}은(는) 필수 입력 항목입니다` });
        } else {
            rule = rule.optional();
        }
        formValues[field.id] = rule;
    });

    const dynamicSchema = z.object(formValues);
    const form = useForm<z.infer<typeof dynamicSchema>>({
        resolver: zodResolver(dynamicSchema),
    });

    return (
        <div className={cn("bg-card border-2 border-primary/5 rounded-lg p-10 shadow-xl", className)}>
            <div className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight mb-2 ">{schema.title}</h2>
                <p className="text-sm text-muted-foreground font-medium">{schema.description}</p>
                <div className="h-1 w-12 bg-primary mt-4 rounded-full" />
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-2 gap-x-6 gap-y-6">
                    {schema.fields.map((field) => (
                        <UIFormField
                            key={field.id}
                            control={form.control}
                            name={field.id}
                            render={({ field: formField }) => (
                                <FormItem className={cn(field.width === 'full' ? "col-span-2" : "col-span-1")}>
                                    <FormLabel className="text-xs font-bold text-muted-foreground tracking-tight ml-1">
                                        {field.label} {field.required ? <span className="text-destructive">*</span> : null}
                                    </FormLabel>
                                    <FormControl>
                                        {field.type === 'textarea' ? (
                                            <Textarea
                                                placeholder={field.placeholder}
                                                {...formField}
                                                value={(formField.value as string) || ''}
                                                className="rounded-lg border-2 border-primary/5 focus:border-primary/20 transition-all min-h-[120px]"
                                            />
                                        ) : field.type === 'select' ? (
                                            <Select onValueChange={formField.onChange} defaultValue={formField.value as string}>
                                                <SelectTrigger className="h-12 rounded-lg border-2 border-primary/5 focus:ring-primary/20 transition-all font-bold">
                                                    <SelectValue placeholder={field.placeholder || "선택하세요"} />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-lg border-primary/10">
                                                    {field.options?.map(opt => (
                                                        <SelectItem key={opt} value={opt} className="rounded-lg m-1 font-bold">{opt}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : field.type === 'checkbox' ? (
                                            <div className="flex items-center space-x-3 p-4 bg-muted/30 rounded-lg border-2 border-transparent hover:border-primary/10 transition-all group">
                                                <Checkbox
                                                    checked={formField.value as boolean}
                                                    onCheckedChange={formField.onChange}
                                                    className="rounded-lg w-5 h-5 border-2 border-primary/20 data-[state=checked]:bg-primary"
                                                />
                                                <span className="text-sm font-bold text-foreground/80 group-hover:text-primary transition-colors cursor-pointer" onClick={() => formField.onChange(!formField.value)}>
                                                    {field.placeholder || "동의합니다"}
                                                </span>
                                            </div>
                                        ) : (
                                            <Input
                                                type={field.type as string}
                                                placeholder={field.placeholder}
                                                {...formField}
                                                value={(formField.value as string) || ''}
                                                className="h-12 rounded-lg border-2 border-primary/5 focus:border-primary/20 transition-all font-bold"
                                            />
                                        )}
                                    </FormControl>
                                    <FormMessage className="text-xs font-bold" />
                                </FormItem>
                            )}
                        />
                    ))}

                    <div className="col-span-2 pt-6 border-t border-primary/5 mt-4 flex justify-end gap-3">
                        <Button type="button" variant="outline" className="rounded-lg h-12 px-8 font-bold border-2" onClick={() => form.reset()}>
                            초기화
                        </Button>
                        <Button type="submit" className="rounded-lg h-12 px-10 font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all">
                            문서 제출하기
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
