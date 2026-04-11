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
  { id: 1, title: '기본 설정', description: '게시판의 이름과 설명을 입력하세요', icon: Settings2 },
  { id: 2, title: '템플릿 선택', description: '용도에 맞는 UI 스타일을 선택하세요', icon: Layout },
  { id: 3, title: '권한 매트릭스', description: '사용자 그룹별 권한을 설정하세요', icon: ShieldCheck },
  { id: 4, title: '메뉴 배포', description: '사이트 메뉴에 게시판을 연결하세요', icon: Rocket },
];

const TEMPLATES = [
  {
    id: 'TMPLT_HUB',
    name: '지식 허브',
    description: '지식 공유에 최적화된 고도화된 대시보드형 레이아웃',
    typeCode: 'BBST01',
    icon: BookOpen,
    color: 'bg-indigo-500',
  },
  {
    id: 'TMPLT_LIST',
    name: 'Enterprise List',
    description: '빠른 검색과 가독성을 중시하는 표준 데이터 테이블',
    typeCode: 'BBST02',
    icon: List,
    color: 'bg-emerald-500',
  },
  {
    id: 'TMPLT_GALLERY',
    name: 'Visual Gallery',
    description: '이미지 및 카드 중심의 시각적 커뮤니티 레이아웃',
    typeCode: 'BBST03',
    icon: ImageIcon,
    color: 'bg-rose-500',
  },
  {
    id: 'TMPLT_QNA',
    name: 'Professional Q&A',
    description: '질문과 해결 중심의 사내 기술 지원 및 상담 레이아웃',
    typeCode: 'BBST04',
    icon: HelpCircle,
    color: 'bg-amber-500',
  },
  {
    id: 'TMPLT_CALENDAR',
    name: 'Event Calendar',
    description: '날짜 기반의 전사 일정 및 교육 현황 관리 레이아웃',
    typeCode: 'BBST05',
    icon: CalendarDays,
    color: 'bg-cyan-500',
  },
  {
    id: 'TMPLT_FAQ',
    name: 'Accordion FAQ',
    description: '질문과 답변을 한눈에 펼쳐보는 아코디언 스타일의 FAQ 레이아웃',
    typeCode: 'BBST06',
    icon: MessageSquare,
    color: 'bg-purple-500',
  },
  {
    id: 'TMPLT_WIKI',
    name: 'Knowledge Wiki',
    description: '방대한 정보를 체계적으로 정리하는 도큐먼트형 위키 레이아웃',
    typeCode: 'BBST07',
    icon: Book,
    color: 'bg-slate-700',
  },
];

const ROLES = [
  { id: 'ROLE_ADMIN', name: '시스템 관리자', icon: Lock, color: 'text-rose-500' },
  { id: 'ROLE_USER', name: '일반 임직원', icon: UserCircle, color: 'text-blue-500' },
  { id: 'ROLE_ANONYMOUS', name: '익명 사용자', icon: UserMinus, color: 'text-slate-400' },
];

const PERMISSIONS = [
  { id: 'list', name: '목록 조회' },
  { id: 'read', name: '글 읽기' },
  { id: 'write', name: '글 쓰기' },
  { id: 'comment', name: '댓글 작성' },
];

const formSchema = z.object({
  bbsNm: z.string().min(2, '게시판 명칭은 최소 2글자 이상이어야 합니다'),
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
      <Card className="max-w-3xl mx-auto border-none shadow-2xl rounded-[0.1rem] overflow-hidden bg-white mt-10">
        <CardContent className="p-20 flex flex-col items-center text-center gap-10">
          <div className="w-32 h-32 rounded-full bg-green-500 flex items-center justify-center text-white animate-bounce-short">
            <Check size={64} strokeWidth={4} />
          </div>
          <div className="space-y-4">
            <h2 className="text-5xl font-black tracking-tighter text-slate-900 italic">MISSION COMPLETE!</h2>
            <p className="text-xl text-slate-400 font-bold leading-relaxed max-w-md mx-auto">
              게시판이 생성되었으며 <span className="text-primary">'{watch('menuNm')}'</span> 메뉴에 성공적으로 연결되었습니다.
            </p>
          </div>
          <div className="flex flex-col gap-4 w-full max-w-sm">
            <Button
              onClick={() => router.push('/admin/community/boards/master')}
              className="h-16 rounded-[0.1rem] bg-primary text-xl font-black hover:scale-105 transition-all shadow-xl shadow-primary/20 italic tracking-tighter"
            >
              게시판 목록 보기
            </Button>
            <Button
              variant="ghost"
              onClick={() => window.location.reload()}
              className="h-14 rounded-[0.1rem] text-slate-400 font-bold hover:text-primary transition-colors"
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
                  "w-14 h-14 rounded-[0.1rem] flex items-center justify-center transition-all duration-500 border-4",
                  isActive ? "bg-primary border-primary text-white shadow-xl shadow-primary/30 scale-110" :
                    isCompleted ? "bg-green-500 border-green-500 text-white" :
                      "bg-white border-slate-200 text-slate-400"
                )}
              >
                {isCompleted ? <Check className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
              </div>
              <div className="text-center">
                <p className={cn("text-xs font-black tracking-tighter", isActive ? "text-primary" : "text-slate-400")}>
                  STEP 0{step.id}
                </p>
                <p className={cn("text-sm font-bold truncate max-w-[100px]", isActive ? "text-slate-900" : "text-slate-400")}>
                  {step.title}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Card */}
      <Card className="border-none shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] rounded-[0.1rem] overflow-hidden bg-white/80 backdrop-blur-xl ring-1 ring-slate-200/50">
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardHeader className="bg-slate-900 p-12 text-white relative">
            <div className="space-y-2 relative z-10 text-left">
              <h3 className="text-4xl font-black tracking-tighter text-left">
                {STEPS[currentStep - 1].title}
              </h3>
              <p className="text-slate-400 font-medium text-lg italic tracking-tight text-left">
                {STEPS[currentStep - 1].description}
              </p>
            </div>
            <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-10 select-none pointer-events-none">
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
                      <Label htmlFor="bbsNm" className="text-xl font-black text-foreground flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-primary rounded-full inline-block" />
                        게시판 명칭
                      </Label>
                      <Input
                        id="bbsNm"
                        autoFocus
                        placeholder="예) 사내 소식 공유 게시판"
                        className={cn(
                          "h-16 text-xl rounded-[0.1rem] border-2 px-6 focus:ring-4 focus:ring-primary/10 transition-all font-bold shadow-inner-sm",
                          errors.bbsNm ? "border-red-500 bg-red-50/10" : "border-border bg-muted/50"
                        )}
                        {...register('bbsNm')}
                      />
                      {errors.bbsNm && <p className="text-red-500 text-sm font-bold ml-2">{errors.bbsNm.message}</p>}
                    </div>

                    <div className="space-y-4 text-left">
                      <Label htmlFor="bbsIntrcn" className="text-xl font-black text-foreground flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-muted rounded-full inline-block" />
                        게시판 소개
                      </Label>
                      <Textarea
                        id="bbsIntrcn"
                        placeholder="게시판의 목적과 사용 대상을 간단히 설명해주세요."
                        className="min-h-[140px] text-lg rounded-[0.1rem] border-2 border-border bg-muted/50 px-6 py-4 focus:ring-4 focus:ring-primary/10 transition-all font-medium shadow-inner-sm text-left"
                        {...register('bbsIntrcn')}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                      <div className="flex items-center justify-between p-8 rounded-[0.1rem] border-2 border-slate-50 bg-slate-50/30 group hover:border-primary/20 transition-all text-left">
                        <div className="space-y-1 text-left">
                          <Label className="text-lg font-black text-slate-800 flex items-center gap-2">
                            댓글 사용 여부
                            <Info className="w-4 h-4 text-slate-300" />
                          </Label>
                          <p className="text-xs text-slate-400 font-bold whitespace-nowrap">게시글에 댓글을 작성할 수 있도록 합니다.</p>
                        </div>
                        <Switch
                          checked={watch('replyPosblAt')}
                          onCheckedChange={(checked) => setValue('replyPosblAt', checked)}
                          className="data-[state=checked]:bg-primary scale-125"
                        />
                      </div>

                      <div className="flex items-center justify-between p-8 rounded-[0.1rem] border-2 border-slate-50 bg-slate-50/30 group hover:border-primary/20 transition-all text-left">
                        <div className="space-y-1 text-left">
                          <Label className="text-lg font-black text-slate-800 flex items-center gap-2">
                            파일 첨부 여부
                            <Info className="w-4 h-4 text-slate-300" />
                          </Label>
                          <p className="text-xs text-slate-400 font-bold whitespace-nowrap text-left">문서 및 이미지를 첨부할 수 있게 합니다.</p>
                        </div>
                        <Switch
                          checked={watch('fileAtchPosblAt')}
                          onCheckedChange={(checked) => setValue('fileAtchPosblAt', checked)}
                          className="data-[state=checked]:bg-primary scale-125"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="flex flex-col lg:flex-row gap-12 text-left">
                    <div className="flex-1 space-y-8 text-left">
                      <div className="space-y-2 text-left">
                        <h4 className="text-xl font-black text-slate-800 tracking-tight italic text-left uppercase">Layout strategy select</h4>
                        <p className="text-sm text-slate-400 font-bold tracking-tight text-left">비즈니스 목적에 부합하는 최적의 UI 디자인을 선택하세요.</p>
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
                                "group relative p-8 rounded-[0.1rem] border-2 transition-all duration-500 cursor-pointer flex items-center gap-6",
                                isSelected ? "border-primary bg-primary/5 ring-4 ring-primary/10 shadow-xl" : "border-slate-50 bg-slate-50/30 hover:border-slate-200"
                              )}
                            >
                              <div className={cn(
                                "w-16 h-16 rounded-[0.1rem] flex items-center justify-center text-white transition-transform group-hover:scale-110 group-hover:rotate-3 shadow-lg",
                                tpl.color
                              )}>
                                <Icon size={32} />
                              </div>

                              <div className="flex-1 space-y-1 text-left">
                                <h4 className="text-xl font-black text-slate-800 tracking-tight text-left">
                                  {tpl.name}
                                </h4>
                                <p className="text-[11px] text-slate-500 font-bold leading-relaxed text-left">
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
                      <div className="p-8 bg-slate-900 rounded-[0.1rem] text-white/40 font-mono text-[10px] tracking-widest leading-relaxed text-left">
                        디자인 최적화 활성 <br />
                        UI 렌더링 모드: 고해상도 <br />
                        템플릿 ID: {selectedTemplate}
                      </div>
                    </div>

                    <div className="flex-1 hidden xl:block sticky top-0">
                      <div className="space-y-4 mb-4">
                        <h4 className="text-[10px] font-black text-slate-400 tracking-[0.4em] uppercase text-right">LIVE_SYSTEM_PREVIEW</h4>
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
                    <div className="rounded-[0.1rem] border-2 border-slate-50 overflow-hidden shadow-inner bg-slate-50/30">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[800px]">
                          <thead>
                            <tr className="bg-slate-900/5 border-b">
                              <th className="p-8 text-left font-black text-slate-400 text-sm tracking-widest uppercase">사용자 그룹 (Roles)</th>
                              {PERMISSIONS.map(p => (
                                <th key={p.id} className="p-8 text-center font-black text-slate-400 text-sm tracking-widest uppercase">{p.name}</th>
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
                                      <div className={cn("p-3 rounded-[0.1rem] bg-white shadow-sm border border-slate-100 shadow-inner-sm", role.color)}>
                                        <RoleIcon size={24} />
                                      </div>
                                      <div className="text-left">
                                        <p className="font-black text-slate-800 text-lg text-left">{role.name}</p>
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

                    <div className="p-8 bg-amber-50 rounded-[0.1rem] border-2 border-amber-100 flex items-start gap-4 shadow-sm text-left">
                      <Info className="w-8 h-8 text-amber-500 shrink-0" />
                      <div className="text-left">
                        <p className="font-black text-amber-900 text-lg text-left">보안 정책 안내</p>
                        <p className="text-sm text-slate-600 font-bold tracking-tight text-left">관리자 그룹은 모든 권한이 기본적으로 부여됩니다. 익명 사용자에게 쓰기 권한을 부여할 경우 스팸 게시물에 주의가 필요합니다.</p>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="space-y-12 text-left">
                    <div className="space-y-6 text-left">
                      <Label className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-primary rounded-full inline-block" />
                        상위 메뉴 선택
                      </Label>
                      <Select value={watch('upperMenuNo')} onValueChange={(val) => setValue('upperMenuNo', val)}>
                        <SelectTrigger className="h-20 rounded-[0.1rem] border-2 border-slate-100 bg-slate-50/50 px-8 text-xl font-black shadow-inner-sm text-left">
                          <SelectValue placeholder="상위 메뉴를 선택하세요" className="text-left" />
                        </SelectTrigger>
                        <SelectContent className="rounded-[0.1rem] border-none shadow-2xl">
                          <SelectItem value="2000000" className="py-4 text-lg font-bold">작업 커뮤니티 및 콘텐츠</SelectItem>
                          <SelectItem value="2030000" className="py-4 text-lg font-bold">정보섹션 및 사용자지원</SelectItem>
                          <SelectItem value="0" className="py-4 text-lg font-bold">ROOT (최상위 메뉴)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                      <div className="space-y-4 text-left">
                        <Label className="text-xl font-black text-slate-800 flex items-center gap-2">
                          메뉴 명칭
                        </Label>
                        <Input
                          placeholder="메뉴에 표시될 이름을 입력하세요"
                          className="h-16 text-lg rounded-[0.1rem] border-2 border-slate-100 bg-slate-50/50 px-6 font-bold shadow-inner-sm text-left"
                          {...register('menuNm')}
                        />
                      </div>
                      <div className="space-y-4 text-left">
                        <Label className="text-xl font-black text-slate-800 flex items-center gap-2 text-left">
                          메뉴 순서
                        </Label>
                        <Input
                          type="number"
                          className="h-16 text-lg rounded-[0.1rem] border-2 border-slate-100 bg-slate-50/50 px-6 font-bold shadow-inner-sm text-left"
                          {...register('menuOrdr', { valueAsNumber: true })}
                        />
                      </div>
                    </div>

                    <div className="p-10 rounded-[0.1rem] bg-slate-900 text-white flex items-center justify-between group overflow-hidden relative text-left">
                      <div className="space-y-2 relative z-10 text-left">
                        <p className="text-primary font-black tracking-widest text-[10px] uppercase text-left">Generated Path</p>
                        <h5 className="text-2xl font-black tracking-tight flex items-center gap-3 text-left">
                          /admin/community/boards/selectBoardList?bbsId=AUTO_GEN
                          <ExternalLink size={20} className="text-slate-600" />
                        </h5>
                        <p className="text-slate-400 text-sm font-bold tracking-tight italic text-left">생성 즉시 메뉴 시스템에 활성화됩니다.</p>
                      </div>
                      <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:scale-110 transition-transform duration-700">
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
              className="h-16 px-10 rounded-[0.1rem] font-black text-slate-600 hover:bg-white hover:text-slate-950 transition-all disabled:opacity-0 flex items-center gap-3 tracking-tighter"
            >
              <ChevronLeft className="w-6 h-6" /> 이전 단계
            </Button>

            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className={cn(
                "h-16 px-12 rounded-[0.1rem] font-black text-xl shadow-xl transition-all text-white min-w-[220px] tracking-tighter",
                currentStep === STEPS.length ? "bg-primary shadow-primary/30 hover:scale-105" : "bg-slate-900 hover:bg-slate-800"
              )}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-left font-black tracking-widest uppercase">{status || 'Processing..'}</span>
                </div>
              ) : (
                <span className="flex items-center gap-3">
                  {currentStep === STEPS.length ? '게시판 생성 및 메뉴 배포' : '다음 단계로'}
                  <ChevronRight className="w-6 h-6" />
                </span>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <p className="text-center text-slate-400 text-[11px] font-black italic tracking-widest uppercase">
        "마지막 클릭이 새로운 소통의 시작입니다" - Board Master Maker v1.0
      </p>
    </div>
  );
}
