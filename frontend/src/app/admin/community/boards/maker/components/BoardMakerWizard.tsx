'use client';

import React, { useState } from 'react';
import { useUnsavedChanges } from '@/contexts/UnsavedChangesContext';
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
/* reusable-base:demo:start */
import { useQuery } from "@tanstack/react-query";
import { communityUserService } from '@/services/business/user/community/CommunityUserService';
/* reusable-base:demo:end */
import {
 ChevronRight,
 ChevronLeft,
 Check,
 Layout,
 ShieldCheck,
 Rocket,
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
import { boardMasterKeys } from '@/queries/board-master-query-options';

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
 /*
   [2026-09-08 PD-CMTY-001] 커뮤니티 귀속(선택).

   값이 있으면 그 게시판은 **회원 전용**이 된다 — 승인된 회원과 관리자만 목록·상세·댓글·
   작성에 접근한다(BoardService.assertCommunityAccess). 빈 문자열은 '귀속 없음' 이며 서버에
   보내지 않는다.

   ⚠ 귀속은 **생성 시점에만** 정한다. 나중에 바꾸면 이미 쌓인 글의 열람 범위가 통째로
   달라지는데(H3 — 인가 의미 변경), 그것은 별도 결정이 필요한 일이다. 서버의
   updateBoardMaster 도 cmntySn 을 건드리지 않는다.
 */
 cmntySn: z.string().optional(),
});

type FormValues = z.infer<typeof boardMakerFormSchema>;

const BOARD_MAKER_FORM_LABELS: Record<string, string> = {
 bbsTtl: '게시판 명칭',
 bbsExpln: '게시판 소개',
 tmpltId: '템플릿',
 cmntySn: '커뮤니티 귀속',
 upperMenuNo: '상위 메뉴',
 menuNm: '메뉴 명칭',
 menuOrdr: '메뉴 순서',
 'root.server': '저장 오류',
};

const BOARD_MAKER_FIELD_STEPS: Record<string, number> = {
 bbsTtl: 1,
 bbsExpln: 1,
 cmntySn: 1,
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
 const createdBoardRef = React.useRef<string | null>(null);
 const [createdBoardId, setCreatedBoardId] = useState<string | null>(null);
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
 cmntySn: '',
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
 const { register, handleSubmit, formState: { errors, isDirty }, watch, setValue } = form;
 useUnsavedChanges(() => ({ dirty: !isSuccess && (isDirty || createdBoardRef.current !== null), pending: submittingRef.current }));

 /*
   [2026-09-08 PD-CMTY-001] 귀속 후보 목록. 관리자 화면이므로 관리자용 목록을 쓴다
   (사용 중지된 커뮤니티도 포함되지만, 그런 커뮤니티에 새 게시판을 붙일 이유가 없어
   사용 중인 것만 후보로 둔다).
 */
/* reusable-base:demo:start */
 const { data: communities } = useQuery({
   queryKey: ['board-maker-communities'],
   queryFn: () => communityUserService.getCommunityList({ pageIndex: 1, pageUnit: 100 }),
 });
 const communityOptions = (communities?.list ?? []).filter((community) => community.useYn === 'Y');
/* reusable-base:demo:end */

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
 setStatus(createdBoardRef.current ? '생성된 게시판의 메뉴를 확인하는 중...' : '게시판을 생성하는 중...');

 try {
 // 1. Create Board Master
 const retryingMenu = createdBoardRef.current !== null;
 const bbsId = createdBoardRef.current ?? await boardAdminService.createBoardMaster({
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
 // [2026-09-08 PD-CMTY-001] 빈 값은 '귀속 없음' 이라 필드를 아예 보내지 않는다.
 //   서버는 없는 커뮤니티 귀속을 404 로 거부한다.
/* reusable-base:demo:start */
 ...(data.cmntySn ? { cmntySn: Number(data.cmntySn) } : {}),
/* reusable-base:demo:end */
 useYn: 'Y'
 });

 if (!bbsId) throw new Error("Failed to get bbsId");
 createdBoardRef.current = bbsId;
 setCreatedBoardId(bbsId);
 const route = `/admin/community/boards/select-board-list?bbsId=${bbsId}`;
 // A response can be lost after the menu was committed. Check the full administrative
 // list (including inactive menus) before retrying; a failed read must not become an insert.
 const existingMenus = retryingMenu ? await menuAdminService.getAllMenus() : [];
 const existingMenu = existingMenus.some((menu) => menu.modernRoute === route);
 setStatus('비활성 메뉴를 등록하는 중...');

 if (!existingMenu) await menuAdminService.createMenu({
 menuNm: data.menuNm || data.bbsTtl,
 upMenuSn: Number(data.upperMenuNo),
 menuOrdr: data.menuOrdr,
 modernRoute: route,
 menuExpln: `Auto-generated menu for board ${data.bbsTtl}`,
 useYn: 'N'
 });

 setStatus('배포 완료. 목록을 갱신하는 중...');

 queryClient.invalidateQueries({ queryKey: boardMasterKeys.lists() });
 queryClient.invalidateQueries({ queryKey: ["menus"] });

 setIsSuccess(true);
 } catch (error: unknown) {
 setStatus('');
 if (createdBoardRef.current) {
   setCurrentStep(4);
   setSubmitError('게시판은 생성되었습니다. 메뉴 등록 결과를 확인하지 못했습니다. 메뉴 등록 다시 시도는 기존 메뉴를 먼저 조회하며 게시판을 새로 만들지 않습니다.');
 }
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
 if (!createdBoardRef.current) setSubmitError('게시판 생성 결과를 확인하지 못했습니다. 게시판 목록에서 생성 여부를 확인한 뒤 다시 시도해 주세요. 입력값은 유지됩니다.');
 }
 } finally {
 submittingRef.current = false;
 setIsSubmitting(false);
 }
 };

 if (isSuccess) {
 return (
 <Card className="mx-auto mt-6 max-w-3xl overflow-hidden rounded-md border border-border bg-card py-0 shadow-none">
 <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
 <div className="flex size-10 items-center justify-center rounded-md bg-success text-success-foreground">
 <Check size={20} strokeWidth={3} aria-hidden="true" />
 </div>
 <div className="space-y-2">
 <h1 className="text-xl font-bold text-foreground">게시판 생성 완료</h1>
 <p className="mx-auto max-w-md text-[length:var(--font-size-body)] leading-relaxed text-muted-foreground">
 게시판이 생성되었으며 <span className="text-primary">&apos;{watch('menuNm')}&apos;</span> 메뉴가 비활성 상태로 만들어졌습니다. 메뉴 관리에서 활성화해 주세요.
 </p>
 </div>
 <div className="flex w-full max-w-sm flex-col gap-2">
 <Button onClick={() => router.push('/admin/system/menus')}>생성한 메뉴 설정하기</Button>
 <Button
 variant="outline"
 onClick={() => router.push('/admin/community/boards/master')}
 >
 게시판 목록 보기
 </Button>
 <Button
 variant="ghost"
 onClick={() => window.location.reload()}
 className="text-muted-foreground hover:text-primary"
 >
 다른 게시판 추가하기
 </Button>
 </div>
 </CardContent>
 </Card>
 );
 }

 return (
 <div className="mx-auto max-w-5xl space-y-4 pb-8 text-left">
 <h1 className="sr-only">게시판 생성 마법사</h1>
 {/* Stepper Header */}
 <div className="flex justify-between items-center px-4 relative">
 <div className="absolute top-1/2 left-0 w-full h-0.5 bg-muted -translate-y-1/2 z-0" />
 {STEPS.map((step) => {
 const Icon = step.icon;
 const isActive = currentStep === step.id;
 const isCompleted = currentStep > step.id;

 return (
 <div key={step.id} className="relative z-10 flex flex-col items-center gap-1.5">
 <div
 className={cn(
 "flex size-8 items-center justify-center rounded-md border transition-colors",
 isActive ? "bg-primary border-primary text-primary-foreground" :
 isCompleted ? "bg-success border-success text-success-foreground" :
 "bg-card border-border text-muted-foreground"
 )}
 >
 {isCompleted ? <Check className="size-4" aria-hidden="true" /> : <Icon className="size-4" aria-hidden="true" />}
 </div>
 <div className="text-center">
 <p className={cn("text-xs", isActive ? "text-primary" : "text-muted-foreground")}>
 STEP 0{step.id}
 </p>
 <p className={cn("whitespace-nowrap text-[length:var(--font-size-body)] font-medium", isActive ? "text-foreground" : "text-muted-foreground")}>
 {step.title}
 </p>
 </div>
 </div>
 );
 })}
 </div>

 {/* Main Content Card */}
 <Card className="overflow-hidden rounded-md border border-border bg-card py-0 shadow-none">
 {/* [2026-07-26] 프로덕션 코드에 남아 있던 디버그 로그 제거. 검증 실패는 폼 UI(필드별 메시지)가
     이미 사용자에게 알리므로 콘솔 출력은 정보 가치가 없다. 게다가 E2E 의 콘솔 오류 가드가 이를
     금지 로그로 잡아 테스트를 실패시켰다(Validation Edge Case: Creation Failure with Empty Name).
     진단이 필요하면 개발 모드 조건부로 출력할 것. */}
 <form onSubmit={handleSubmit(onSubmit)} noValidate>
 <FormErrorSummary
 errors={errors}
 labels={BOARD_MAKER_FORM_LABELS}
 onNavigate={form.focusError}
 className="mx-4 mt-4"
 />
 {submitError ? (
 <div
 ref={submitErrorRef}
 role="alert"
 tabIndex={-1}
 className="mx-4 mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-[length:var(--font-size-body)] font-medium text-destructive-emphasis"
 >
 {submitError}
 </div>
 ) : null}
 <CardHeader className="relative border-b border-border bg-muted p-4 text-foreground">
 <div className="relative z-10 space-y-1 text-left">
 <h2 className="text-lg font-bold text-left">
 {STEPS[currentStep - 1].title}
 </h2>
 <p className="text-[length:var(--font-size-body)] text-muted-foreground text-left">
 {STEPS[currentStep - 1].description}
 </p>
 </div>
 </CardHeader>

 <CardContent className="min-h-[20rem] p-4 text-left">
 <div key={currentStep}>
 {currentStep === 1 && (
 <div className="max-w-2xl space-y-4 text-left">
 <div className="space-y-1 text-left">
 <Label htmlFor="bbsTtl" className="text-[length:var(--font-size-body)] font-medium text-foreground">
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
 "bg-card text-[length:var(--font-size-body)]",
 errors.bbsTtl ? "border-destructive bg-destructive/10" : "border-border"
 )}
 {...register('bbsTtl')}
 />
 {errors.bbsTtl && <p id="bbsTtl-error" className="text-destructive-emphasis text-sm font-bold ml-2">{errors.bbsTtl.message}</p>}
 </div>

 <div className="space-y-1 text-left">
 <Label htmlFor="bbsExpln" className="text-[length:var(--font-size-body)] font-medium text-foreground">
 게시판 소개
 </Label>
 <Textarea
 id="bbsExpln"
 maxLength={4000}
 aria-invalid={errors.bbsExpln ? 'true' : 'false'}
 aria-describedby={errors.bbsExpln ? 'bbsExpln-error' : undefined}
 placeholder="게시판의 목적과 사용 대상을 간단히 설명해주세요."
 className="min-h-[5rem] border-border bg-card text-[length:var(--font-size-body)] text-left"
 {...register('bbsExpln')}
 />
 {errors.bbsExpln && <p id="bbsExpln-error" className="text-destructive-emphasis text-sm font-bold ml-2">{errors.bbsExpln.message}</p>}
 </div>

{/* reusable-base:demo:start */}
 <div className="space-y-1 text-left">
 <Label htmlFor="cmntySn" className="text-[length:var(--font-size-body)] font-medium text-foreground">
 커뮤니티 귀속
 </Label>
 <select
 id="cmntySn"
 aria-describedby="cmntySn-help"
 className="h-[var(--control-h)] w-full rounded-md border border-border bg-card px-3 text-[length:var(--font-size-body)] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
 {...register('cmntySn')}
 >
 <option value="">귀속하지 않음 (모든 인증 사용자 열람)</option>
 {communityOptions.map((community) => (
 <option key={community.cmntySn} value={String(community.cmntySn)}>
 {community.cmntyNm}
 </option>
 ))}
 </select>
 <p id="cmntySn-help" className="text-[length:var(--font-size-body)] text-muted-foreground">
 커뮤니티에 귀속하면 <strong>승인된 회원과 관리자만</strong> 이 게시판의 글을 보고 쓸 수 있고,
 통합 검색 결과에서도 제외됩니다. 귀속은 생성 후에는 바꿀 수 없습니다.
 </p>
 </div>
{/* reusable-base:demo:end */}

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
 <div className="flex flex-col gap-6 text-left lg:flex-row">
 <div className="flex-1 space-y-4 text-left">
 <div className="space-y-1 text-left">
 <h3 className="text-[length:var(--font-size-body)] font-semibold text-foreground text-left">Layout strategy select</h3>
 <p className="text-[length:var(--font-size-body)] text-muted-foreground text-left">비즈니스 목적에 부합하는 최적의 UI 디자인을 선택하세요.</p>
 </div>
 <div className="grid grid-cols-1 gap-2">
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
 // group relative p-8 은 e2e page object(BoardMasterPage.fillStep2)가 템플릿 카드를 찾는
 // 셀렉터다(.group.relative.p-8). 이 세 클래스 이름은 바꾸지 않는다.
 "group relative p-8 rounded-md border cursor-pointer flex items-center gap-3 transition-colors",
 isSelected ? "border-primary bg-primary/5" : "border-border bg-muted/30 hover:border-primary"
 )}
 >
 <div className={cn(
 "flex size-9 shrink-0 items-center justify-center rounded-md",
 tpl.color
 )}>
 <Icon size={18} aria-hidden="true" />
 </div>

 <div className="flex-1 space-y-0.5 text-left">
 <h4 className="text-[length:var(--font-size-body)] font-semibold text-foreground text-left">
 {tpl.name}
 </h4>
 <p className="text-xs text-muted-foreground leading-snug text-left">
 {tpl.description}
 </p>
 </div>

 <div className={cn(
 "flex size-6 shrink-0 items-center justify-center rounded-md border transition-colors",
 isSelected ? "bg-primary border-primary text-primary-foreground" : "border-border text-transparent"
 )}>
 <Check size={14} strokeWidth={3} aria-hidden="true" />
 </div>
 </div>
 );
 })}
 </div>
 <div className="rounded-md border border-border bg-muted p-3 font-mono text-xs leading-relaxed text-muted-foreground text-left">
 디자인 최적화 활성 <br />
 UI 렌더링 모드: 고해상도 <br />
 템플릿 ID: {selectedTemplate}
 </div>
 </div>

 <div className="sticky top-0 hidden flex-1 xl:block">
 <div className="mb-2">
 <h3 className="text-xs font-medium text-muted-foreground text-right">레이아웃 미리보기 · 예시 데이터</h3>
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
 <div className="max-w-2xl space-y-3 text-left">
 <div className="space-y-3 rounded-md border border-border bg-muted/30 p-4 text-left">
 <div className="flex items-start gap-3">
 <div className="shrink-0 rounded-md border border-border bg-card p-2 text-primary">
 <ShieldCheck size={24} aria-hidden="true" />
 </div>
 <div className="space-y-2 text-left">
 <p className="font-semibold text-foreground text-[length:var(--font-size-body)] text-left">이 게시판의 접근 권한은 메뉴 권한을 따릅니다</p>
 <p className="text-[length:var(--font-size-body)] text-muted-foreground text-left">
 게시판은 다음 단계에서 선택하는 상위 메뉴 아래에 등록됩니다. 어떤 역할이 이 게시판을
 볼 수 있는지는 그 메뉴에 부여된 권한으로 결정되며, 게시판 단위의 별도 권한 설정은
 현재 제공하지 않습니다.
 </p>
 </div>
 </div>

 <div className="rounded-md border border-border bg-card p-3 space-y-2 text-left">
 <p className="text-xs font-semibold text-muted-foreground">현재 적용되는 규칙</p>
 <ul className="space-y-1 text-[length:var(--font-size-body)] text-foreground list-disc pl-5">
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

 <div className="flex items-start gap-3 rounded-md border border-warning/40 bg-warning/15 p-4 text-left">
 <Info className="size-4 shrink-0 text-foreground" aria-hidden="true" />
 <div className="space-y-1 text-left">
 <p className="font-semibold text-foreground text-[length:var(--font-size-body)] text-left">게시판 생성 후 확인하세요</p>
 <p className="text-[length:var(--font-size-body)] text-muted-foreground text-left">
 게시판과 함께 생성된 메뉴는 기본적으로 권한이 부여되지 않은 상태일 수 있습니다.
 생성 직후 권한 정책 관리에서 해당 메뉴를 담당 역할에 배정해야 사용자에게 노출됩니다.
 </p>
 </div>
 </div>
 </div>
 )}

 {currentStep === 4 && (
 <div className="max-w-2xl space-y-4 text-left">
 <div className="space-y-1 text-left">
 <Label htmlFor="upperMenuNo" className="text-[length:var(--font-size-body)] font-medium text-foreground">
 상위 메뉴 선택
 </Label>
 <Select
 value={watch('upperMenuNo')}
 onValueChange={(val) => setValue('upperMenuNo', val as FormValues['upperMenuNo'], { shouldDirty: true, shouldValidate: true })}
 >
 <SelectTrigger id="upperMenuNo" aria-required="true" aria-invalid={errors.upperMenuNo ? 'true' : 'false'} className="border-border text-[length:var(--font-size-body)] text-left">
 <SelectValue placeholder="상위 메뉴를 선택하세요" className="text-left" />
 </SelectTrigger>
 <SelectContent className="rounded-md">
 <SelectItem value="2000000" className="text-[length:var(--font-size-body)]">소통·지식</SelectItem>
 <SelectItem value="2030000" className="text-[length:var(--font-size-body)]">관리 센터 &gt; 업무 지원</SelectItem>
 <SelectItem value="0" className="text-[length:var(--font-size-body)]">ROOT (최상위 메뉴)</SelectItem>
 </SelectContent>
 </Select>
 {errors.upperMenuNo && <p className="text-destructive-emphasis text-sm font-bold ml-2">{errors.upperMenuNo.message}</p>}
 </div>

 <div className="grid grid-cols-1 gap-4 text-left md:grid-cols-2">
 <div className="space-y-1 text-left">
 <Label htmlFor="menuNm" className="text-[length:var(--font-size-body)] font-medium text-foreground">
 메뉴 명칭
 </Label>
 <Input
 id="menuNm"
 maxLength={100}
 aria-required="true"
 aria-invalid={errors.menuNm ? 'true' : 'false'}
 aria-describedby={errors.menuNm ? 'menuNm-error' : undefined}
 placeholder="메뉴에 표시될 이름을 입력하세요"
 className="border-border bg-card text-[length:var(--font-size-body)] text-left"
 {...register('menuNm')}
 />
 {errors.menuNm && <p id="menuNm-error" className="text-destructive-emphasis text-sm font-bold ml-2">{errors.menuNm.message}</p>}
 </div>
 <div className="space-y-1 text-left">
 <Label htmlFor="menuOrdr" className="text-[length:var(--font-size-body)] font-medium text-foreground text-left">
 메뉴 순서
 </Label>
 <Input
 id="menuOrdr"
 type="number"
 step="1"
 aria-required="true"
 aria-invalid={errors.menuOrdr ? 'true' : 'false'}
 aria-describedby={errors.menuOrdr ? 'menuOrdr-error' : undefined}
 className="border-border bg-card text-[length:var(--font-size-body)] text-left"
 {...register('menuOrdr', { valueAsNumber: true })}
 />
 {errors.menuOrdr && <p id="menuOrdr-error" className="text-destructive-emphasis text-sm font-bold ml-2">{errors.menuOrdr.message}</p>}
 </div>
 </div>

 <div className="rounded-md border border-border bg-muted p-3 text-left text-foreground">
 <div className="space-y-1 text-left">
 <p className="text-xs font-semibold text-primary text-left">Generated Path</p>
 <p className="break-all font-mono text-[length:var(--font-size-body)] text-left">
 /admin/community/boards/select-board-list?bbsId=AUTO_GEN
 </p>
 <p className="text-[length:var(--font-size-body)] text-muted-foreground text-left">메뉴는 비활성(미사용) 상태로 생성됩니다. 메뉴 관리에서 활성화해야 내비게이션에 나타납니다.</p>
 </div>
 </div>
 </div>
 )}
 </div>
 </CardContent>

 <CardFooter className="flex items-center justify-between border-t border-border bg-muted/50 p-4 text-left">
 <Button
 type="button"
 variant="ghost"
 size="lg"
 onClick={prevStep}
 disabled={currentStep === 1 || isSubmitting || createdBoardId !== null}
 className="flex items-center gap-2 font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground disabled:invisible"
 >
 <ChevronLeft className="size-4" aria-hidden="true" /> 이전 단계
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
 "font-semibold transition-colors",
 currentStep === STEPS.length
 ? "bg-primary text-primary-foreground"
 : "bg-surface-inverse text-surface-inverse-foreground dark:bg-primary dark:text-primary-foreground hover:bg-surface-inverse/90 dark:hover:bg-primary/90"
 )}
 >
 {isSubmitting ? (
 <span className="flex items-center gap-2">
 <Loader2 className="size-4 animate-spin" aria-hidden="true" />
 <span className="text-left font-semibold">{status || 'Processing..'}</span>
 </span>
 ) : (
 <span className="flex items-center gap-3">
 {currentStep === STEPS.length ? createdBoardId ? '메뉴 등록 다시 시도' : '게시판 생성 및 메뉴 배포' : '다음 단계로'}
 <ChevronRight className="size-4" aria-hidden="true" />
 </span>
 )}
 </Button>
 </CardFooter>
 </form>
 </Card>

 <p className="text-center text-xs text-muted-foreground">
 &ldquo;마지막 클릭이 새로운 소통의 시작입니다&rdquo; - Board Master Maker v1.0
 </p>
 </div>
 );
}
