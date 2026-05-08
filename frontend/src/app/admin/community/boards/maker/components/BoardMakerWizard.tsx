'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BoardPreview } from './BoardPreview';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { boardAdminService } from '@/services/foundation/system/BoardAdminService';
import { useQueryClient } from "@tanstack/react-query";
import {
 ChevronRight,
 ChevronLeft,
 Check,
 Layout,
 ShieldCheck,
 Rocket,
 ExternalLink,
 Loader2,
 HelpCircle,
 CalendarDays,
 Book,
 MessageSquare,
 Settings2,
 BookOpen,
 List,
 ImageIcon,
 Lock,
 UserCircle,
 UserMinus,
 Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { menuAdminService } from '@/services/foundation/system/MenuAdminService';

const STEPS = [
 { id: 1, title: '기본 ?�정', description: '게시?�의 ?�름�??�명???�력?�세??, icon: Settings2 },
 { id: 2, title: '?�플�??�택', description: '?�도??맞는 UI ?��??�을 ?�택?�세??, icon: Layout },
 { id: 3, title: '권한 매트�?��', description: '?�용??그룹�?권한???�정?�세??, icon: ShieldCheck },
 { id: 4, title: '메뉴 배포', description: '?�이??메뉴??게시?�을 ?�결?�세??, icon: Rocket },
];

const TEMPLATES = [
 {
 id: 'TMPLT_HUB',
 name: '지???�브',
 description: '지??공유??최적?�된 고도?�된 ?�?�보?�형 ?�이?�웃',
 typeCode: 'BBST01',
 icon: BookOpen,
 color: 'bg-indigo-500',
 },
 {
 id: 'TMPLT_LIST',
 name: 'Enterprise List',
 description: '빠른 검?�과 가?�성??중시?�는 ?��? ?�이???�이�?,
 typeCode: 'BBST02',
 icon: List,
 color: 'bg-emerald-500',
 },
 {
 id: 'TMPLT_GALLERY',
 name: 'Visual Gallery',
 description: '?��?지 �?카드 중심???�각??커�??�티 ?�이?�웃',
 typeCode: 'BBST03',
 icon: ImageIcon,
 color: 'bg-rose-500',
 },
 {
 id: 'TMPLT_QNA',
 name: 'Professional Q&A',
 description: '질문�??�결 중심???�내 기술 지??�??�담 ?�이?�웃',
 typeCode: 'BBST04',
 icon: HelpCircle,
 color: 'bg-amber-500',
 },
 {
 id: 'TMPLT_CALENDAR',
 name: 'Event Calendar',
 description: '?�짜 기반???�사 ?�정 �?교육 ?�황 관�??�이?�웃',
 typeCode: 'BBST05',
 icon: CalendarDays,
 color: 'bg-cyan-500',
 },
 {
 id: 'TMPLT_FAQ',
 name: 'Accordion FAQ',
 description: '질문�??��????�눈???�쳐보는 ?�코?�언 ?��??�의 FAQ ?�이?�웃',
 typeCode: 'BBST06',
 icon: MessageSquare,
 color: 'bg-purple-500',
 },
 {
 id: 'TMPLT_WIKI',
 name: 'Knowledge Wiki',
 description: '방�????�보�?체계?�으�??�리?�는 ?�큐먼트???�키 ?�이?�웃',
 typeCode: 'BBST07',
 icon: Book,
 color: 'bg-slate-700',
 },
];

const ROLES = [
 { id: 'ROLE_ADMIN', name: '?�스??관리자', icon: Lock, color: 'text-rose-500' },
 { id: 'ROLE_USER', name: '?�반 ?�직??, icon: UserCircle, color: 'text-blue-500' },
 { id: 'ROLE_ANONYMOUS', name: '?�명 ?�용??, icon: UserMinus, color: 'text-slate-400' },
];

const PERMISSIONS = [
 { id: 'list', name: '목록 조회' },
 { id: 'read', name: '글 ?�기' },
 { id: 'write', name: '글 ?�기' },
 { id: 'comment', name: '?��? ?�성' },
];

const formSchema = z.object({
 bbsNm: z.string().min(2, '게시??명칭?� 최소 2글???�상?�어???�니??),
 bbsIntrcn: z.string(),
 replyPosblAt: z.boolean(),
 fileAtchPosblAt: z.boolean(),
 atchPosblFileNumber: z.number(),
 atchPosblFileSize: z.number(),
 bbsTyCode: z.string(),
 tmplatId: z.string(),
 cmmntyId: z.string().optional(),
 permissions: z.record(z.string(), z.array(z.string())),
 menuNm: z.string(),
 upperMenuNo: z.string(),
 menuOrdr: z.number(),
});

type FormValues = z.infer<typeof formSchema>;

export function BoardMakerWizard() {
 const router = useRouter();
 const [currentStep, setCurrentStep] = useState(1);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [isSuccess, setIsSuccess] = useState(false);
 const [status, setStatus] = useState('');
 const queryClient = useQueryClient();

 const { register, handleSubmit, control, formState: { errors }, watch, setValue } = useForm<FormValues>({
 resolver: zodResolver(formSchema),
 defaultValues: {
 bbsNm: '',
 bbsIntrcn: '',
 replyPosblAt: false,
 fileAtchPosblAt: true,
 atchPosblFileNumber: 3,
 atchPosblFileSize: 5242880, // 5MB
 bbsTyCode: 'BBST01',
 tmplatId: 'TMPLT_HUB',
 cmmntyId: '',
 permissions: {
 'ROLE_ADMIN': ['list', 'read', 'write', 'comment'],
 'ROLE_USER': ['list', 'read', 'write', 'comment'],
 'ROLE_ANONYMOUS': ['list', 'read'],
 },
 menuNm: '',
 upperMenuNo: '2000000',
 menuOrdr: 1,
 }
 });

 const selectedTemplate = watch('tmplatId');
 const permissions = watch('permissions');
 const bbsNm = watch('bbsNm');
 const bbsIntrcn = watch('bbsIntrcn');

 const nextStep = () => {
 if (currentStep === 1 && !watch('menuNm')) {
 setValue('menuNm', bbsNm);
 }
 setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
 };
 const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

 const togglePermission = (roleId: string, permId: string) => {
 const rolePerms = (permissions[roleId] as string[]) || [];
 const newPerms = rolePerms.includes(permId)
 ? rolePerms.filter(p => p !== permId)
 : [...rolePerms, permId];

 setValue('permissions', {
 ...permissions,
 [roleId]: newPerms
 });
 };

 const onSubmit = async (data: FormValues) => {
 if (currentStep < STEPS.length) {
 nextStep();
 return;
 }

 setIsSubmitting(true);
 setStatus("Creating Board Master in Core...");

 try {
 // 1. Create Board Master
 const bbsId = await boardAdminService.createBoardMaster({
 bbsNm: data.bbsNm,
 bbsIntrcn: data.bbsIntrcn,
 bbsTyCode: data.bbsTyCode,
 bbsAttrbCode: 'BBSA01', // Missing field causing 500 error
 replyPosblAt: data.replyPosblAt ? 'Y' : 'N',
 fileAtchPosblAt: data.fileAtchPosblAt ? 'Y' : 'N',
 atchPosblFileNumber: Number(data.atchPosblFileNumber),
 atchPosblFileSize: Number(data.atchPosblFileSize),
 tmplatId: data.tmplatId,
 blogAt: 'N',
 useAt: 'Y'
 } as any);

 if (!bbsId) throw new Error("Failed to get bbsId");

 const generatedMenuNo = 8000000 + Math.floor(Math.random() * 900000);

 await menuAdminService.createMenu({
 menuNo: generatedMenuNo,
 menuNm: data.menuNm || data.bbsNm,
 upperMenuNo: Number(data.upperMenuNo),
 menuOrdr: data.menuOrdr,
 progrmFileNm: 'EgovBBSMaster',
 modernRoute: `/admin/community/boards/selectBoardList?bbsId=${bbsId}`,
 menuDc: `Auto-generated menu for board ${data.bbsNm}`
 } as any);

 setStatus("Provisioning Complete. Refreshing Graph...");

 queryClient.invalidateQueries({ queryKey: ["boardMasters"] });
 queryClient.invalidateQueries({ queryKey: ["menus"] });

 setIsSuccess(true);
 } catch (error) {
 console.error('Validation/Submission Error:', error);
 setStatus("Failed to reconcile system state.");
 } finally {
 setIsSubmitting(false);
 }
 };

 if (isSuccess) {
 return (
 <Card className="max-w-3xl mx-auto border-none shadow-2xl rounded-lg overflow-hidden bg-white mt-10">
 <CardContent className="p-20 flex flex-col items-center text-center gap-10">
 <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center text-white animate-bounce-short">
 <Check size={48} strokeWidth={4} />
 </div>
 <div className="space-y-4">
 <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">MISSION COMPLETE!</h2>
 <p className="text-lg text-slate-500 dark:text-slate-400 font-bold leading-relaxed max-w-md mx-auto transition-colors">
 게시?�이 ?�성?�었?�며 <span className="text-primary">'{watch('menuNm')}'</span> 메뉴???�공?�으�??�결?�었?�니??
 </p>
 </div>
 <div className="flex flex-col gap-4 w-full max-w-sm">
 <Button
 onClick={() => router.push('/admin/community/boards/master')}
 className="h-11 rounded-lg bg-primary text-lg font-bold hover:scale-105 transition-all shadow-xl shadow-primary/20 tracking-tight"
 >
 게시??목록 보기
 </Button>
 <Button
 variant="ghost"
 onClick={() => window.location.reload()}
 className="h-12 rounded-lg text-slate-400 font-bold hover:text-primary transition-colors"
 >
 ?�른 게시??추�??�기
 </Button>
 </div>
 </CardContent>
 </Card>
 );
 }

 return (
 <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 text-left">
 {/* Stepper Header */}
 <div className="flex justify-between items-center px-4 relative">
 <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -translate-y-1/2 z-0" />
 {STEPS.map((step) => {
 const Icon = step.icon;
 const isActive = currentStep === step.id;
 const isCompleted = currentStep > step.id;

 return (
 <div key={step.id} className="relative z-10 flex flex-col items-center gap-3">
 <div
 className={cn(
 "w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-500 border-4",
 isActive ? "bg-primary border-primary text-white shadow-xl shadow-primary/30 scale-110" :
 isCompleted ? "bg-green-500 border-green-500 text-white" :
 "bg-white border-slate-200 text-slate-400"
 )}
 >
 {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
 </div>
 <div className="text-center">
 <p className={cn("text-xs font-bold tracking-widest", isActive ? "text-primary" : "text-slate-400")}>
 STEP 0{step.id}
 </p>
 <p className={cn("text-sm font-bold truncate max-w-[100px]", isActive ? "text-slate-900 dark:text-white" : "text-slate-400")}>
 {step.title}
 </p>
 </div>
 </div>
 );
 })}
 </div>

 {/* Main Content Card */}
 <Card className="border-none shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] rounded-lg overflow-hidden bg-white/80 backdrop-blur-xl ring-1 ring-slate-200/50">
 <form onSubmit={handleSubmit(onSubmit)}>
 <CardHeader className="bg-slate-50 dark:bg-slate-900 p-12 text-slate-900 dark:text-white relative border-b border-slate-100 dark:border-slate-800 transition-colors">
 <div className="space-y-2 relative z-10 text-left">
 <h3 className="text-2xl font-bold tracking-tight text-left">
 {STEPS[currentStep - 1].title}
 </h3>
 <p className="text-slate-500 dark:text-slate-400 font-medium text-base tracking-tight text-left transition-colors">
 {STEPS[currentStep - 1].description}
 </p>
 </div>
 <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-5 dark:opacity-10 select-none pointer-events-none">
 {React.createElement(STEPS[currentStep - 1].icon, { size: 120 })}
 </div>
 </CardHeader>

 <CardContent className="p-12 min-h-[550px] text-left">
 <AnimatePresence mode="wait">
 <motion.div
 key={currentStep}
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: -20 }}
 transition={{ duration: 0.3 }}
 style={{ pointerEvents: 'auto' }}
 >
 {currentStep === 1 && (
 <div className="space-y-10 text-left">
 <div className="space-y-4 text-left">
 <Label htmlFor="bbsNm" className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 transition-colors text-left">
 <span className="w-1.5 h-5 bg-primary rounded-full inline-block" />
 게시??명칭
 </Label>
 <Input
 id="bbsNm"
 autoFocus
 placeholder="?? ?�내 ?�식 공유 게시??
 className={cn(
 "h-12 text-lg rounded-lg border-2 px-6 focus:ring-4 focus:ring-primary/10 transition-all font-bold shadow-inner-sm bg-white dark:bg-slate-950",
 errors.bbsNm ? "border-red-500 bg-red-50/10" : "border-slate-200 dark:border-slate-800"
 )}
 {...register('bbsNm')}
 />
 {errors.bbsNm && <p className="text-red-500 text-sm font-bold ml-2">{errors.bbsNm.message}</p>}
 </div>

 <div className="space-y-4 text-left">
 <Label htmlFor="bbsIntrcn" className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 transition-colors text-left">
 <span className="w-1.5 h-5 bg-slate-200 dark:bg-slate-700 rounded-full inline-block" />
 게시???�개
 </Label>
 <Textarea
 id="bbsIntrcn"
 placeholder="게시?�의 목적�??�용 ?�?�을 간단???�명?�주?�요."
 className="min-h-[120px] text-base rounded-lg border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-6 py-4 focus:ring-4 focus:ring-primary/10 transition-all font-medium shadow-inner-sm text-left"
 {...register('bbsIntrcn')}
 />
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
 <div className="flex items-center justify-between p-8 rounded-lg border-2 border-slate-50 bg-slate-50/30 group hover:border-primary/20 transition-all text-left">
 <div className="space-y-1 text-left">
 <Label className="text-base font-bold text-slate-800 flex items-center gap-2">
 ?��? ?�용 ?��?
 <Info className="w-4 h-4 text-slate-300" />
 </Label>
 <p className="text-xs text-slate-400 font-bold whitespace-nowrap">게시글???��????�성?????�도�??�니??</p>
 </div>
 <Switch
 checked={watch('replyPosblAt')}
 onCheckedChange={(checked) => setValue('replyPosblAt', checked)}
 className="data-[state=checked]:bg-primary scale-110"
 />
 </div>

 <div className="flex items-center justify-between p-8 rounded-lg border-2 border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10 group hover:border-primary/20 transition-all text-left">
 <div className="space-y-1 text-left">
 <Label className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 transition-colors">
 ?�일 첨�? ?��?
 <Info className="w-4 h-4 text-slate-300 dark:text-slate-600" />
 </Label>
 <p className="text-xs text-slate-400 font-bold whitespace-nowrap text-left transition-colors">문서 �??��?지�?첨�??????�게 ?�니??</p>
 </div>
 <Switch
 checked={watch('fileAtchPosblAt')}
 onCheckedChange={(checked) => setValue('fileAtchPosblAt', checked)}
 className="data-[state=checked]:bg-primary scale-110 transition-colors"
 />
 </div>
 </div>
 </div>
 )}

 {currentStep === 2 && (
 <div className="flex flex-col lg:flex-row gap-12 text-left">
 <div className="flex-1 space-y-8 text-left">
 <div className="space-y-2 text-left">
 <h4 className="text-lg font-bold text-slate-800 tracking-tight text-left uppercase">Layout strategy select</h4>
 <p className="text-sm text-slate-400 font-bold tracking-tight text-left">비즈?�스 목적??부?�하??최적??UI ?�자?�을 ?�택?�세??</p>
 </div>
 <div className="grid grid-cols-1 gap-6">
 {TEMPLATES.map((tpl) => {
 const Icon = tpl.icon;
 const isSelected = selectedTemplate === tpl.id;

 return (
 <div
 key={tpl.id}
 onClick={() => {
 setValue('tmplatId', tpl.id);
 setValue('bbsTyCode', tpl.typeCode);
 }}
 className={cn(
 "group relative p-8 rounded-lg border-2 transition-all duration-500 cursor-pointer flex items-center gap-6",
 isSelected ? "border-primary bg-primary/5 ring-4 ring-primary/10 shadow-xl" : "border-slate-50 bg-slate-50/30 hover:border-slate-200"
 )}
 >
 <div className={cn(
 "w-16 h-12 rounded-lg flex items-center justify-center text-white transition-transform group-hover:scale-110 group-hover:rotate-3 shadow-lg",
 tpl.color
 )}>
 <Icon size={32} />
 </div>

 <div className="flex-1 space-y-1 text-left">
 <h4 className="text-xl font-bold text-slate-800 tracking-tight text-left">
 {tpl.name}
 </h4>
 <p className="text-xs text-slate-500 font-bold leading-relaxed text-left">
 {tpl.description}
 </p>
 </div>

 <div className={cn(
 "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all",
 isSelected ? "bg-primary border-primary text-white" : "border-slate-200 text-transparent"
 )}>
 <Check size={16} strokeWidth={4} />
 </div>
 </div>
 );
 })}
 </div>
 <div className="p-8 bg-slate-100 dark:bg-slate-950 rounded-lg text-slate-400 dark:text-white/40 font-mono text-xs tracking-widest leading-relaxed text-left border border-slate-200 dark:border-slate-800 transition-colors">
 ?�자??최적???�성 <br />
 UI ?�더�?모드: 고해?�도 <br />
 ?�플�?ID: {selectedTemplate}
 </div>
 </div>

 <div className="flex-1 hidden xl:block sticky top-0">
 <div className="space-y-4 mb-4">
 <h4 className="text-xs font-bold text-slate-400 tracking-widest uppercase text-right">LIVE_SYSTEM_PREVIEW</h4>
 </div>
 <BoardPreview
 tmplatId={selectedTemplate}
 bbsNm={bbsNm}
 bbsIntrcn={bbsIntrcn}
 />
 </div>
 </div>
 )}

 {currentStep === 3 && (
 <div className="space-y-8 text-left">
 <div className="rounded-lg border-2 border-slate-50 overflow-hidden shadow-inner bg-slate-50/30">
 <div className="overflow-x-auto">
 <table className="w-full min-w-[800px]">
 <thead>
 <tr className="bg-slate-900/5 border-b text-left">
 <th className="p-8 text-left font-bold text-slate-400 text-xs tracking-widest uppercase">?�용??그룹 (Roles)</th>
 {PERMISSIONS.map(p => (
 <th key={p.id} className="p-8 text-center font-bold text-slate-400 text-xs tracking-widest uppercase">{p.name}</th>
 ))}
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {ROLES.map(role => {
 const RoleIcon = role.icon;
 const rolePerms = (permissions[role.id] as string[]) || [];

 return (
 <tr key={role.id} className="group hover:bg-white transition-colors">
 <td className="p-8">
 <div className="flex items-center gap-4 text-left">
 <div className={cn("p-3 rounded-lg bg-white shadow-sm border border-slate-100 shadow-inner-sm", role.color)}>
 <RoleIcon size={20} />
 </div>
 <div className="text-left">
 <p className="font-bold text-slate-800 text-lg text-left">{role.name}</p>
 <p className="text-xs text-slate-400 font-bold uppercase text-left">{role.id}</p>
 </div>
 </div>
 </td>
 {PERMISSIONS.map(perm => {
 const isChecked = rolePerms.includes(perm.id);
 return (
 <td key={perm.id} className="p-8 text-center text-left">
 <div className="flex items-center justify-center">
 <Checkbox
 checked={isChecked}
 onCheckedChange={() => togglePermission(role.id, perm.id)}
 className={cn(
 "w-8 h-8 rounded-lg transition-all border-2",
 isChecked ? "bg-primary border-primary text-white scale-110 shadow-lg shadow-primary/20" : "bg-white border-slate-200"
 )}
 />
 </div>
 </td>
 );
 })}
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>

 <div className="p-8 bg-amber-50 rounded-lg border-2 border-amber-100 flex items-start gap-4 shadow-sm text-left">
 <Info className="w-6 h-6 text-amber-500 shrink-0" />
 <div className="text-left">
 <p className="font-bold text-amber-900 text-lg text-left">보안 ?�책 ?�내</p>
 <p className="text-sm text-slate-600 font-bold tracking-tight text-left">관리자 그룹?� 모든 권한??기본?�으�?부?�됩?�다. ?�명 ?�용?�에�??�기 권한??부?�할 경우 ?�팸 게시물에 주의가 ?�요?�니??</p>
 </div>
 </div>
 </div>
 )}

 {currentStep === 4 && (
 <div className="space-y-12 text-left">
 <div className="space-y-6 text-left">
 <Label className="text-lg font-bold text-slate-800 flex items-center gap-2 text-left">
 <span className="w-1.5 h-5 bg-primary rounded-full inline-block" />
 ?�위 메뉴 ?�택
 </Label>
 <Select value={watch('upperMenuNo')} onValueChange={(val) => setValue('upperMenuNo', val)}>
 <SelectTrigger className="h-12 rounded-lg border-2 border-slate-100 bg-slate-50/50 px-8 text-lg font-bold shadow-inner-sm text-left">
 <SelectValue placeholder="?�위 메뉴�??�택?�세?? className="text-left" />
 </SelectTrigger>
 <SelectContent className="rounded-lg border-none shadow-2xl">
 <SelectItem value="2000000" className="py-2 text-base font-bold">?�업 커�??�티 �?콘텐�?/SelectItem>
 <SelectItem value="2030000" className="py-2 text-base font-bold">?�보?�션 �??�용?��???/SelectItem>
 <SelectItem value="0" className="py-2 text-base font-bold">ROOT (최상??메뉴)</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
 <div className="space-y-4 text-left">
 <Label className="text-lg font-bold text-slate-800 flex items-center gap-2 text-left">
 메뉴 명칭
 </Label>
 <Input
 placeholder="메뉴???�시???�름???�력?�세??
 className="h-12 text-base rounded-lg border-2 border-slate-100 bg-slate-50/50 px-6 font-bold shadow-inner-sm text-left"
 {...register('menuNm')}
 />
 </div>
 <div className="space-y-4 text-left">
 <Label className="text-lg font-bold text-slate-800 flex items-center gap-2 text-left">
 메뉴 ?�서
 </Label>
 <Input
 type="number"
 className="h-12 text-base rounded-lg border-2 border-slate-100 bg-slate-50/50 px-6 font-bold shadow-inner-sm text-left"
 {...register('menuOrdr', { valueAsNumber: true })}
 />
 </div>
 </div>

 <div className="p-10 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-none flex items-center justify-between group overflow-hidden relative text-left transition-colors">
 <div className="space-y-2 relative z-10 text-left">
 <p className="text-primary font-bold tracking-widest text-xs uppercase text-left transition-colors">Generated Path</p>
 <h5 className="text-xl font-bold tracking-tight flex items-center gap-3 text-left transition-colors">
 /admin/community/boards/selectBoardList?bbsId=AUTO_GEN
 <ExternalLink size={20} className="text-slate-400 dark:text-slate-600" />
 </h5>
 <p className="text-slate-500 dark:text-slate-400 text-sm font-bold tracking-tight text-left transition-colors">?�성 즉시 메뉴 ?�스?�에 ?�성?�됩?�다.</p>
 </div>
 <div className="absolute right-[-20px] top-[-20px] opacity-[0.03] dark:opacity-10 group-hover:scale-110 transition-transform duration-700">
 <Rocket size={200} />
 </div>
 </div>
 </div>
 )}
 </motion.div>
 </AnimatePresence>
 </CardContent>

 <CardFooter className="p-10 bg-slate-50/50 border-t flex justify-between items-center text-left">
 <Button
 type="button"
 variant="ghost"
 size="lg"
 onClick={prevStep}
 disabled={currentStep === 1 || isSubmitting}
 className="h-12 px-8 rounded-lg font-bold text-slate-600 hover:bg-white hover:text-slate-950 transition-all disabled:opacity-0 flex items-center gap-3 tracking-tight"
 >
 <ChevronLeft className="w-5 h-5" /> ?�전 ?�계
 </Button>

 <Button
 type="submit"
 size="lg"
 disabled={isSubmitting}
 className={cn(
 "h-12 px-10 rounded-lg font-bold text-lg shadow-xl transition-all text-white min-w-[200px] tracking-tight",
 currentStep === STEPS.length ? "bg-primary shadow-primary/30 hover:scale-105" : "bg-slate-900 dark:bg-primary hover:bg-slate-800 dark:hover:bg-primary/90"
 )}
 >
 {isSubmitting ? (
 <div className="flex items-center gap-3">
 <Loader2 className="w-5 h-5 animate-spin" />
 <span className="text-left font-bold tracking-widest uppercase">{status || 'Processing..'}</span>
 </div>
 ) : (
 <span className="flex items-center gap-3">
 {currentStep === STEPS.length ? '게시???�성 �?메뉴 배포' : '?�음 ?�계�?}
 <ChevronRight className="w-5 h-5" />
 </span>
 )}
 </Button>
 </CardFooter>
 </form>
 </Card>

 <p className="text-center text-slate-400 text-xs font-bold tracking-widest uppercase">
 "마�?�??�릭???�로???�통???�작?�니?? - Board Master Maker v1.0
 </p>
 </div>
 );
}

