'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BoardPreview } from './BoardPreview';
import * as z from 'zod';
import { Card,  CardContent,  CardHeader,  CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
 ArrowUpRight,
 Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { menuAdminService } from '@/services/foundation/system/MenuAdminService';
import { useAppForm } from '@/hooks/useAppForm';
import { FormErrorSummary } from '@/components/ui/form';
import { extractFieldErrors } from '@/app/actions/actionUtils';

const STEPS = [
 { id: 1, title: '기본 설정', description: '게시판의 이름과 설명을 입력하세요', icon: Settings2 },
 { id: 2, title: '템플릿 선택', description: '용도에 맞는 UI 스타일을 선택하세요', icon: Layout },
 { id: 3, title: '접근 권한 안내', description: '이 게시판의 접근 권한이 어떻게 결정되는지 확인하세요', icon: ShieldCheck },
 { id: 4, title: '메뉴 배포', description: '사이트 메뉴에 게시판을 연결하세요', icon: Rocket },
];

const TEMPLATES = [
 {
 id: 'TMPLT_HUB',
 name: '지식 허브',
 description: '지식 공유에 최적화된 고도화된 대시보드형 레이아웃',
 typeCode: 'BBST01',
 icon: BookOpen,
 color: 'bg-primary text-primary-foreground',
 },
 {
 id: 'TMPLT_LIST',
 name: 'Enterprise List',
 description: '빠른 검색과 가독성을 중시하는 표준 데이터 테이블',
 typeCode: 'BBST02',
 icon: List,
 color: 'bg-success text-success-foreground',
 },
 {
 id: 'TMPLT_GALLERY',
 name: 'Visual Gallery',
 description: '이미지 및 카드 중심의 시각적 커뮤니티 레이아웃',
 typeCode: 'BBST03',
 icon: ImageIcon,
 color: 'bg-destructive text-destructive-foreground',
 },
 {
 id: 'TMPLT_QNA',
 name: 'Professional Q&A',
 description: '질문과 해결 중심의 사내 기술 지원 및 상담 레이아웃',
 typeCode: 'BBST04',
 icon: HelpCircle,
 color: 'bg-warning text-warning-foreground',
 },
 {
 id: 'TMPLT_CALENDAR',
 name: 'Event Calendar',
 description: '날짜 기반의 전사 일정 및 교육 현황 관리 레이아웃',
 typeCode: 'BBST05',
 icon: CalendarDays,
 color: 'bg-info text-info-foreground',
 },
 {
 id: 'TMPLT_FAQ',
 name: 'Accordion FAQ',
 description: '질문과 답변을 한눈에 펼쳐보는 아코디언 스타일의 FAQ 레이아웃',
 typeCode: 'BBST06',
 icon: MessageSquare,
 color: 'bg-primary text-primary-foreground',
 },
 {
 id: 'TMPLT_WIKI',
 name: 'Knowledge Wiki',
 description: '방대한 정보를 체계적으로 정리하는 도큐먼트형 위키 레이아웃',
 typeCode: 'BBST07',
 icon: Book,
 color: 'bg-surface-inverse text-surface-inverse-foreground',
 },
];

import { BoardMasterDtoSchema, MenuDtoSchema } from '@/types/generated-zod';

export const boardMakerFormSchema = BoardMasterDtoSchema.extend({
 bbsTtl: BoardMasterDtoSchema.shape.bbsTtl
   .trim()
   .min(2, '게시판 명칭을 2자 이상 입력해 주세요.')
   .max(100, '게시판 명칭은 최대 100자까지 입력할 수 있습니다.'),
 bbsExpln: BoardMasterDtoSchema.shape.bbsExpln
   .unwrap()
   .trim()
   .max(4000, '게시판 소개는 최대 4,000자까지 입력할 수 있습니다.'),
 atchPsbltyFileQty: z.number().int('첨부 가능 파일 수는 정수여야 합니다.'),
 atchPsbltyFileSz: z.number().int('첨부 가능 파일 크기는 정수여야 합니다.'),
 tmpltId: BoardMasterDtoSchema.shape.tmpltId.unwrap().max(20),
 menuNm: MenuDtoSchema.shape.menuNm
   .trim()
   .min(1, '메뉴 명칭을 입력해 주세요.')
   .max(100, '메뉴 명칭은 최대 100자까지 입력할 수 있습니다.'),
 upperMenuNo: z.enum(['0', '2000000', '2030000'], { message: '상위 메뉴를 선택해 주세요.' }),
 menuOrdr: MenuDtoSchema.shape.menuOrdr.int('메뉴 순서는 정수여야 합니다.'),
});

type FormValues = z.infer<typeof boardMakerFormSchema>;

const BOARD_MAKER_FORM_LABELS: Record<string, string> = {
 bbsTtl: '게시판 명칭',
 bbsExpln: '게시판 소개',
 tmpltId: '템플릿',
 upperMenuNo: '상위 메뉴',
 menuNm: '메뉴 명칭',
 menuOrdr: '메뉴 순서',
 'root.server': '저장 오류',
};

const BOARD_MAKER_FIELD_STEPS: Record<string, number> = {
 bbsTtl: 1,
 bbsExpln: 1,
 tmpltId: 2,
 upperMenuNo: 4,
 upMenuSn: 4,
 menuNm: 4,
 menuOrdr: 4,
};

const BOARD_MAKER_SERVER_FIELD_ALIASES: Record<string, keyof FormValues> = {
 upMenuSn: 'upperMenuNo',
};

export function BoardMakerWizard() {
 const router = useRouter();
 const [currentStep, setCurrentStep] = useState(1);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [isSuccess, setIsSuccess] = useState(false);
 const [status, setStatus] = useState('');
 const submittingRef = React.useRef(false);
 // 감사 P1-1/삼킴 금지: 배포 실패 시 status 문자열만 바꿨는데 그 문자열은 isSubmitting 중에만 렌더돼
 // 제출이 끝나는 순간 사라졌다(= 실패가 화면에 전혀 남지 않음). 별도 상태로 오류를 계속 노출한다.
 const [submitError, setSubmitError] = useState<string | null>(null);
 const submitErrorRef = React.useRef<HTMLDivElement>(null);
 const queryClient = useQueryClient();

 const form = useAppForm<typeof boardMakerFormSchema>(boardMakerFormSchema, {
 defaultValues: {
 bbsTtl: '',
 bbsExpln: '',
 atchPsbltyFileQty: 3,
 atchPsbltyFileSz: 5242880, // 5MB
 bbsTypeCd: 'BBST01',
 bbsAtrbCd: 'BBSA01',
 tmpltId: 'TMPLT_HUB',
 useYn: 'Y',
 menuNm: '',
 upperMenuNo: '2000000',
 menuOrdr: 1,
 }
 }, {
 revealField: async (fieldName) => {
 const targetStep = BOARD_MAKER_FIELD_STEPS[fieldName];
 if (targetStep) setCurrentStep(targetStep);
 },
 });
 const { register, handleSubmit, formState: { errors }, watch, setValue } = form;

 const selectedTemplate = watch('tmpltId');
 const bbsTtl = watch('bbsTtl');
 const bbsExpln = watch('bbsExpln');

 React.useEffect(() => {
 if (!submitError || !submitErrorRef.current) return;
 submitErrorRef.current.scrollIntoView?.({ behavior: 'auto', block: 'center' });
 submitErrorRef.current.focus({ preventScroll: true });
 }, [submitError]);

 const nextStep = () => {
 if (currentStep === 1 && !watch('menuNm')) {
 setValue('menuNm', bbsTtl, { shouldDirty: true });
 }
 setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
 };
 const handleNextStep = async () => {
 const fields: Array<keyof FormValues> = currentStep === 1
 ? ['bbsTtl', 'bbsExpln']
 : currentStep === 2
 ? ['tmpltId']
 : [];
 const isValid = fields.length === 0 || await form.trigger(fields);
 if (!isValid) {
 const firstInvalid = fields.find((field) => form.getFieldState(field).invalid);
 if (firstInvalid) await form.focusError(firstInvalid);
 return;
 }
 setSubmitError(null);
 nextStep();
 };
 const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

 const onSubmit = async (data: FormValues) => {
 if (submittingRef.current) return;

 submittingRef.current = true;
 setIsSubmitting(true);
 setSubmitError(null);
 setStatus('게시판을 생성하는 중...');

 try {
 // 1. Create Board Master
 const bbsId = await boardAdminService.createBoardMaster({
 bbsTtl: data.bbsTtl,
 bbsExpln: data.bbsExpln,
 bbsTypeCd: data.bbsTypeCd,
 bbsAtrbCd: 'BBSA01', // Missing field causing 500 error
 // [2026-08-29] 종전 1단계의 '댓글 사용 여부'·'파일 첨부 여부' 토글을 걷어내고 값을
 //   기본값으로 고정한다. 두 값은 저장될 뿐 **집행자가 저장소 전체에 없다** — 전량 grep 상
 //   조건문에 쓰이는 곳이 0건이고, 게시글 상세는 `<CommentSection>` 을 분기 없이 렌더한다.
 //   즉 관리자가 껐다고 믿은 게시판에도 모든 인증 사용자가 댓글을 쓸 수 있었다.
 //   ('댓글 사용 여부' 라벨은 필드 의미와도 달랐다 — ans_psblty_yn 은 '답변가능여부'다.)
 //   집행을 구현하면 그때 토글을 되살린다. 값은 종전 기본값과 같아 생성 결과는 불변이다.
 ansPsbltyYn: 'N',
 fileAtchPsbltyYn: 'Y',
 atchPsbltyFileQty: Number(data.atchPsbltyFileQty),
 atchPsbltyFileSz: Number(data.atchPsbltyFileSz),
 tmpltId: data.tmpltId,
 blogYn: 'N',
 useYn: 'Y'
 } as any);

 if (!bbsId) throw new Error("Failed to get bbsId");

 await menuAdminService.createMenu({
 menuNm: data.menuNm || data.bbsTtl,
 upMenuSn: Number(data.upperMenuNo),
 menuOrdr: data.menuOrdr,
 prgrmFileNm: 'EgovBBSMaster',
 modernRoute: `/admin/community/boards/select-board-list?bbsId=${bbsId}`,
 menuExpln: `Auto-generated menu for board ${data.bbsTtl}`,
 useYn: 'N'
 });

 setStatus('배포 완료. 목록을 갱신하는 중...');

 queryClient.invalidateQueries({ queryKey: ["boardMasters"] });
 queryClient.invalidateQueries({ queryKey: ["menus"] });

 setIsSuccess(true);
 } catch (error: unknown) {
 setStatus('');
 const serverErrors = extractFieldErrors(error);
 if (serverErrors && Object.keys(serverErrors).length > 0) {
 let firstNavigableField: string | null = null;
 for (const [serverField, message] of Object.entries(serverErrors)) {
 const alias = BOARD_MAKER_SERVER_FIELD_ALIASES[serverField];
 const fieldName: string = alias ?? (
 Object.prototype.hasOwnProperty.call(BOARD_MAKER_FIELD_STEPS, serverField)
 ? serverField as keyof FormValues
 : 'root.server'
 );
 form.setError(fieldName as never, { type: 'server', message });
 if (!firstNavigableField && fieldName !== 'root.server') firstNavigableField = fieldName;
 }
 if (firstNavigableField) void form.focusError(firstNavigableField, 'server');
 } else if (!form.applyServerErrors(error)) {
 setSubmitError('게시판 생성 및 메뉴 배포에 실패했습니다. 입력값은 유지되므로 내용을 확인한 뒤 다시 시도해 주세요.');
 }
 } finally {
 submittingRef.current = false;
 setIsSubmitting(false);
 }
 };

 if (isSuccess) {
 return (
 <Card className="max-w-3xl mx-auto border-none shadow-2xl rounded-lg overflow-hidden bg-card mt-10">
 <CardContent className="p-20 flex flex-col items-center text-center gap-10">
 <div className="w-32 h-32 rounded-lg bg-success flex items-center justify-center text-success-foreground animate-bounce-short">
 <Check size={64} strokeWidth={4} />
 </div>
 <div className="space-y-4">
 <h1 className="text-5xl font-bold tracking-tighter text-foreground transition-colors">게시판 생성 완료</h1>
 <p className="text-xl text-muted-foreground dark:text-muted-foreground font-bold leading-relaxed max-w-md mx-auto transition-colors">
 게시판이 생성되었으며 <span className="text-primary">'{watch('menuNm')}'</span> 메뉴가 비활성 상태로 만들어졌습니다. 메뉴 관리에서 활성화해 주세요.
 </p>
 </div>
 <div className="flex flex-col gap-4 w-full max-w-sm">
 <Button
 onClick={() => router.push('/admin/community/boards/master')}
 className="h-11 rounded-lg bg-primary text-xl font-bold hover:scale-105 transition-all shadow-xl shadow-primary/20 tracking-tighter"
 >
 게시판 목록 보기
 </Button>
 <Button
 variant="ghost"
 onClick={() => window.location.reload()}
 className="h-11 rounded-lg text-muted-foreground font-bold hover:text-primary transition-colors"
 >
 다른 게시판 추가하기
 </Button>
 </div>
 </CardContent>
 </Card>
 );
 }

 return (
 <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 text-left">
 <h1 className="sr-only">게시판 생성 마법사</h1>
 {/* Stepper Header */}
 <div className="flex justify-between items-center px-4 relative">
 <div className="absolute top-1/2 left-0 w-full h-0.5 bg-muted -translate-y-1/2 z-0" />
 {STEPS.map((step) => {
 const Icon = step.icon;
 const isActive = currentStep === step.id;
 const isCompleted = currentStep > step.id;

 return (
 <div key={step.id} className="relative z-10 flex flex-col items-center gap-3">
 <div
 className={cn(
 "w-14 h-11 rounded-lg flex items-center justify-center transition-all duration-500 border-4",
 isActive ? "bg-primary border-primary text-primary-foreground shadow-xl shadow-primary/30 scale-110" :
 isCompleted ? "bg-success border-success text-success-foreground" :
 "bg-card border-border text-muted-foreground"
 )}
 >
 {isCompleted ? <Check className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
 </div>
 <div className="text-center">
 <p className={cn("text-xs font-bold tracking-tighter", isActive ? "text-primary" : "text-muted-foreground")}>
 STEP 0{step.id}
 </p>
 <p className={cn("text-sm font-bold truncate max-w-[100px]", isActive ? "text-foreground" : "text-muted-foreground")}>
 {step.title}
 </p>
 </div>
 </div>
 );
 })}
 </div>

 {/* Main Content Card */}
 <Card className="border-none shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] rounded-lg overflow-hidden bg-card/95 backdrop-blur-xl ring-1 ring-border/50">
 {/* [2026-07-26] 프로덕션 코드에 남아 있던 디버그 로그 제거. 검증 실패는 폼 UI(필드별 메시지)가
     이미 사용자에게 알리므로 콘솔 출력은 정보 가치가 없다. 게다가 E2E 의 콘솔 오류 가드가 이를
     금지 로그로 잡아 테스트를 실패시켰다(Validation Edge Case: Creation Failure with Empty Name).
     진단이 필요하면 개발 모드 조건부로 출력할 것. */}
 <form onSubmit={handleSubmit(onSubmit)} noValidate>
 <FormErrorSummary
 errors={errors}
 labels={BOARD_MAKER_FORM_LABELS}
 onNavigate={form.focusError}
 className="mx-12 mt-8"
 />
 {submitError ? (
 <div
 ref={submitErrorRef}
 role="alert"
 tabIndex={-1}
 className="mx-12 mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm font-bold text-destructive-emphasis"
 >
 {submitError}
 </div>
 ) : null}
 <CardHeader className="bg-muted p-12 text-foreground relative border-b border-border transition-colors">
 <div className="space-y-2 relative z-10 text-left">
 <h3 className="text-4xl font-bold tracking-tighter text-left">
 {STEPS[currentStep - 1].title}
 </h3>
 <p className="text-muted-foreground dark:text-muted-foreground font-medium text-lg tracking-tight text-left transition-colors">
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
 <Label htmlFor="bbsTtl" className="text-xl font-bold text-foreground flex items-center gap-2 transition-colors">
 <span className="w-1.5 h-6 bg-primary rounded-lg inline-block" />
 게시판 명칭
 </Label>
 <Input
 id="bbsTtl"
 autoFocus
 maxLength={100}
 aria-required="true"
 aria-invalid={errors.bbsTtl ? 'true' : 'false'}
 aria-describedby={errors.bbsTtl ? 'bbsTtl-error' : undefined}
 placeholder="예) 사내 소식 공유 게시판"
 className={cn(
 "h-11 text-xl rounded-lg border-2 px-6 focus:ring-4 focus:ring-primary/10 transition-all font-bold shadow-inner-sm bg-card",
 errors.bbsTtl ? "border-destructive bg-destructive/10" : "border-border"
 )}
 {...register('bbsTtl')}
 />
 {errors.bbsTtl && <p id="bbsTtl-error" className="text-destructive-emphasis text-sm font-bold ml-2">{errors.bbsTtl.message}</p>}
 </div>

 <div className="space-y-4 text-left">
 <Label htmlFor="bbsExpln" className="text-xl font-bold text-foreground flex items-center gap-2 transition-colors">
 <span className="w-1.5 h-6 bg-muted rounded-lg inline-block" />
 게시판 소개
 </Label>
 <Textarea
 id="bbsExpln"
 maxLength={4000}
 aria-invalid={errors.bbsExpln ? 'true' : 'false'}
 aria-describedby={errors.bbsExpln ? 'bbsExpln-error' : undefined}
 placeholder="게시판의 목적과 사용 대상을 간단히 설명해주세요."
 className="min-h-[140px] text-lg rounded-lg border-2 border-border bg-card px-6 py-4 focus:ring-4 focus:ring-primary/10 transition-all font-medium shadow-inner-sm text-left"
 {...register('bbsExpln')}
 />
 {errors.bbsExpln && <p id="bbsExpln-error" className="text-destructive-emphasis text-sm font-bold ml-2">{errors.bbsExpln.message}</p>}
 </div>

 {/*
   [2026-08-29] '댓글 사용 여부'·'파일 첨부 여부' 토글을 걷어냈다.
   두 스위치는 값을 저장할 뿐 어떤 동작도 바꾸지 못했다 — 저장소 전량 grep 에서
   ansPsbltyYn·fileAtchPsbltyYn 을 조건으로 읽는 코드가 0건이고, 게시글 상세는
   `<CommentSection>` 을 분기 없이 렌더한다. 관리자는 댓글을 막았다고 믿었지만
   그 게시판에서도 모든 인증 사용자가 댓글을 쓸 수 있었다.
   집행 경로(서버 검사 + 화면 게이트)를 만들면 그때 되살린다.
 */}
 </div>
 )}

 {currentStep === 2 && (
 <div className="flex flex-col lg:flex-row gap-12 text-left">
 <div className="flex-1 space-y-8 text-left">
 <div className="space-y-2 text-left">
 <h4 className="text-xl font-bold text-foreground tracking-tight text-left uppercase">Layout strategy select</h4>
 <p className="text-sm text-muted-foreground font-bold tracking-tight text-left">비즈니스 목적에 부합하는 최적의 UI 디자인을 선택하세요.</p>
 </div>
 <div className="grid grid-cols-1 gap-6">
 {TEMPLATES.map((tpl) => {
 const Icon = tpl.icon;
 const isSelected = selectedTemplate === tpl.id;

 return (
 <div
 key={tpl.id}
 role="button"
 tabIndex={0}
 onClick={() => {
 setValue('tmpltId', tpl.id);
 setValue('bbsTypeCd', tpl.typeCode);
 }}
 onKeyDown={(e) => {
 if (e.key === 'Enter' || e.key === ' ') {
 e.preventDefault();
 setValue('tmpltId', tpl.id);
 setValue('bbsTypeCd', tpl.typeCode);
 }
 }}
 className={cn(
 "group relative p-8 rounded-lg border-2 transition-all duration-500 cursor-pointer flex items-center gap-6",
 isSelected ? "border-primary bg-primary/5 ring-4 ring-primary/10 shadow-xl" : "border-border bg-muted/30 hover:border-border"
 )}
 >
 <div className={cn(
 "w-16 h-11 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-3 shadow-lg",
 tpl.color
 )}>
 <Icon size={32} />
 </div>

 <div className="flex-1 space-y-1 text-left">
 <h4 className="text-xl font-bold text-foreground tracking-tight text-left">
 {tpl.name}
 </h4>
 <p className="text-xs text-muted-foreground font-bold leading-relaxed text-left">
 {tpl.description}
 </p>
 </div>

 <div className={cn(
 "w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all",
 isSelected ? "bg-primary border-primary text-primary-foreground" : "border-border text-transparent"
 )}>
 <Check size={16} strokeWidth={4} />
 </div>
 </div>
 );
 })}
 </div>
 <div className="p-8 bg-muted rounded-lg text-muted-foreground font-mono text-xs tracking-widest leading-relaxed text-left border border-border transition-colors">
 디자인 최적화 활성 <br />
 UI 렌더링 모드: 고해상도 <br />
 템플릿 ID: {selectedTemplate}
 </div>
 </div>

 <div className="flex-1 hidden xl:block sticky top-0">
 <div className="space-y-4 mb-4">
 <h4 className="text-xs font-bold text-muted-foreground tracking-tight text-right">레이아웃 미리보기 · 예시 데이터</h4>
 </div>
 <BoardPreview
 tmpltId={selectedTemplate || 'TMPLT_HUB'}
 bbsTtl={bbsTtl}
 bbsExpln={bbsExpln || ''}
 />
 </div>
 </div>
 )}

 {currentStep === 3 && (
 /*
  * 이 단계에는 역할×권한 체크박스 매트릭스가 있었으나, 게시판별 권한은 저장할 테이블도
  * API 도 존재하지 않아 선택값이 서버로 전송되지 않고 브라우저에서 사라졌다.
  * 운영자는 '익명 쓰기 금지'를 설정했다고 믿지만 실제로는 아무 정책도 적용되지 않는
  * 보안 오인 상태였다. 실제 통제 지점(메뉴 권한)을 안내하도록 대체한다.
  */
 <div className="space-y-8 text-left">
 <div className="p-8 bg-muted/30 rounded-lg border-2 border-border shadow-inner space-y-6 text-left">
 <div className="flex items-start gap-4">
 <div className="p-3 rounded-lg bg-card shadow-sm border border-border text-primary shrink-0">
 <ShieldCheck size={24} aria-hidden="true" />
 </div>
 <div className="space-y-2 text-left">
 <p className="font-bold text-foreground text-lg text-left">이 게시판의 접근 권한은 메뉴 권한을 따릅니다</p>
 <p className="text-sm text-muted-foreground font-bold tracking-tight text-left">
 게시판은 다음 단계에서 선택하는 상위 메뉴 아래에 등록됩니다. 어떤 역할이 이 게시판을
 볼 수 있는지는 그 메뉴에 부여된 권한으로 결정되며, 게시판 단위의 별도 권한 설정은
 현재 제공하지 않습니다.
 </p>
 </div>
 </div>

 <div className="rounded-lg border-2 border-border bg-card p-6 space-y-3 text-left">
 <p className="text-xs font-bold text-muted-foreground tracking-widest uppercase">현재 적용되는 규칙</p>
 <ul className="space-y-2 text-sm font-bold text-foreground list-disc pl-5">
 <li>비로그인 사용자는 게시글을 작성할 수 없습니다(인증 필수).</li>
 <li>메뉴가 보이지 않는 역할은 해당 게시판 화면에 접근하지 않습니다.</li>
 <li>읽기·쓰기·댓글을 역할별로 나누어 제한하는 기능은 제공되지 않습니다.</li>
 </ul>
 </div>

 <Link
 href="/admin/security/authority"
 target="_blank"
 rel="noopener noreferrer"
 className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
 >
 권한 정책 관리에서 메뉴 권한 설정하기
 <ArrowUpRight size={16} aria-hidden="true" />
 </Link>
 </div>

 <div className="p-8 bg-amber-50 rounded-lg border-2 border-amber-100 flex items-start gap-4 shadow-sm text-left">
 <Info className="w-8 h-8 text-amber-500 shrink-0" aria-hidden="true" />
 <div className="text-left">
 <p className="font-bold text-amber-900 text-lg text-left">게시판 생성 후 확인하세요</p>
 <p className="text-sm text-muted-foreground font-bold tracking-tight text-left">
 게시판과 함께 생성된 메뉴는 기본적으로 권한이 부여되지 않은 상태일 수 있습니다.
 생성 직후 권한 정책 관리에서 해당 메뉴를 담당 역할에 배정해야 사용자에게 노출됩니다.
 </p>
 </div>
 </div>
 </div>
 )}

 {currentStep === 4 && (
 <div className="space-y-12 text-left">
 <div className="space-y-6 text-left">
 <Label htmlFor="upperMenuNo" className="text-xl font-bold text-foreground flex items-center gap-2">
 <span className="w-1.5 h-6 bg-primary rounded-lg inline-block" />
 상위 메뉴 선택
 </Label>
 <Select
 value={watch('upperMenuNo')}
 onValueChange={(val) => setValue('upperMenuNo', val as FormValues['upperMenuNo'], { shouldDirty: true, shouldValidate: true })}
 >
 <SelectTrigger id="upperMenuNo" aria-required="true" aria-invalid={errors.upperMenuNo ? 'true' : 'false'} className="h-11 rounded-lg border-2 border-border bg-muted/50 px-8 text-xl font-bold shadow-inner-sm text-left">
 <SelectValue placeholder="상위 메뉴를 선택하세요" className="text-left" />
 </SelectTrigger>
 <SelectContent className="rounded-lg border-none shadow-2xl">
 <SelectItem value="2000000" className="py-4 text-lg font-bold">작업 커뮤니티 및 콘텐츠</SelectItem>
 <SelectItem value="2030000" className="py-4 text-lg font-bold">정보섹션 및 사용자지원</SelectItem>
 <SelectItem value="0" className="py-4 text-lg font-bold">ROOT (최상위 메뉴)</SelectItem>
 </SelectContent>
 </Select>
 {errors.upperMenuNo && <p className="text-destructive-emphasis text-sm font-bold ml-2">{errors.upperMenuNo.message}</p>}
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
 <div className="space-y-4 text-left">
 <Label htmlFor="menuNm" className="text-xl font-bold text-foreground flex items-center gap-2">
 메뉴 명칭
 </Label>
 <Input
 id="menuNm"
 maxLength={100}
 aria-required="true"
 aria-invalid={errors.menuNm ? 'true' : 'false'}
 aria-describedby={errors.menuNm ? 'menuNm-error' : undefined}
 placeholder="메뉴에 표시될 이름을 입력하세요"
 className="h-11 text-lg rounded-lg border-2 border-border bg-muted/50 px-6 font-bold shadow-inner-sm text-left"
 {...register('menuNm')}
 />
 {errors.menuNm && <p id="menuNm-error" className="text-destructive-emphasis text-sm font-bold ml-2">{errors.menuNm.message}</p>}
 </div>
 <div className="space-y-4 text-left">
 <Label htmlFor="menuOrdr" className="text-xl font-bold text-foreground flex items-center gap-2 text-left">
 메뉴 순서
 </Label>
 <Input
 id="menuOrdr"
 type="number"
 step="1"
 aria-required="true"
 aria-invalid={errors.menuOrdr ? 'true' : 'false'}
 aria-describedby={errors.menuOrdr ? 'menuOrdr-error' : undefined}
 className="h-11 text-lg rounded-lg border-2 border-border bg-muted/50 px-6 font-bold shadow-inner-sm text-left"
 {...register('menuOrdr', { valueAsNumber: true })}
 />
 {errors.menuOrdr && <p id="menuOrdr-error" className="text-destructive-emphasis text-sm font-bold ml-2">{errors.menuOrdr.message}</p>}
 </div>
 </div>

 <div className="p-10 rounded-lg bg-muted text-foreground border border-border dark:border-none flex items-center justify-between group overflow-hidden relative text-left transition-colors">
 <div className="space-y-2 relative z-10 text-left">
 <p className="text-primary font-bold tracking-widest text-xs uppercase text-left transition-colors">Generated Path</p>
 <h5 className="text-2xl font-bold tracking-tight flex items-center gap-3 text-left transition-colors">
 /admin/community/boards/select-board-list?bbsId=AUTO_GEN
 <ExternalLink size={20} className="text-muted-foreground dark:text-muted-foreground" />
 </h5>
 <p className="text-muted-foreground dark:text-muted-foreground text-sm font-bold tracking-tight text-left transition-colors">메뉴는 비활성(미사용) 상태로 생성됩니다. 메뉴 관리에서 활성화해야 내비게이션에 나타납니다.</p>
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

 <CardFooter className="p-10 bg-muted/50 border-t flex justify-between items-center text-left">
 <Button
 type="button"
 variant="ghost"
 size="lg"
 onClick={prevStep}
 disabled={currentStep === 1 || isSubmitting}
 className="h-11 px-10 rounded-lg font-bold text-muted-foreground hover:bg-card hover:text-foreground transition-all disabled:opacity-0 flex items-center gap-3 tracking-tighter"
 >
 <ChevronLeft className="w-6 h-6" aria-hidden="true" /> 이전 단계
 </Button>

 <Button
 type={currentStep === STEPS.length ? 'submit' : 'button'}
 onClick={currentStep === STEPS.length ? undefined : (event) => {
 event.preventDefault();
 void handleNextStep();
 }}
 size="lg"
 disabled={isSubmitting}
 className={cn(
 "h-11 px-12 rounded-lg font-bold text-xl shadow-xl transition-all min-w-[220px] tracking-tighter",
 currentStep === STEPS.length
 ? "bg-primary text-primary-foreground shadow-primary/30 hover:scale-105"
 : "bg-surface-inverse text-surface-inverse-foreground dark:bg-primary dark:text-primary-foreground hover:bg-surface-inverse/90 dark:hover:bg-primary/90"
 )}
 >
 {isSubmitting ? (
 <div className="flex items-center gap-3">
 <Loader2 className="w-6 h-6 animate-spin" />
 <span className="text-left font-bold tracking-widest uppercase">{status || 'Processing..'}</span>
 </div>
 ) : (
 <span className="flex items-center gap-3">
 {currentStep === STEPS.length ? '게시판 생성 및 메뉴 배포' : '다음 단계로'}
 <ChevronRight className="w-6 h-6" aria-hidden="true" />
 </span>
 )}
 </Button>
 </CardFooter>
 </form>
 </Card>

 <p className="text-center text-muted-foreground text-xs font-bold tracking-widest uppercase">
 "마지막 클릭이 새로운 소통의 시작입니다" - Board Master Maker v1.0
 </p>
 </div>
 );
}

