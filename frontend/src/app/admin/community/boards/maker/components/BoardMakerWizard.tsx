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
  { id: 1, title: '湲곕낯 ?ㅼ젙', description: '寃뚯떆?먯쓽 ?대쫫怨??ㅻ챸???낅젰?섏꽭??, icon: Settings2 },
  { id: 2, title: '?쒗뵆由??좏깮', description: '?⑸룄??留욌뒗 UI ?ㅽ??쇱쓣 ?좏깮?섏꽭??, icon: Layout },
  { id: 3, title: '沅뚰븳 留ㅽ듃由?뒪', description: '?ъ슜??洹몃９蹂?沅뚰븳???ㅼ젙?섏꽭??, icon: ShieldCheck },
  { id: 4, title: '硫붾돱 諛고룷', description: '?ъ씠??硫붾돱??寃뚯떆?먯쓣 ?곌껐?섏꽭??, icon: Rocket },
];

const TEMPLATES = [
  {
    id: 'TMPLT_HUB',
    name: '吏???덈툕',
    description: '吏??怨듭쑀??理쒖쟻?붾맂 怨좊룄?붾맂 ??쒕낫?쒗삎 ?덉씠?꾩썐',
    typeCode: 'BBST01',
    icon: BookOpen,
    color: 'bg-indigo-500',
  },
  {
    id: 'TMPLT_LIST',
    name: 'Enterprise List',
    description: '鍮좊Ⅸ 寃?됯낵 媛?낆꽦??以묒떆?섎뒗 ?쒖? ?곗씠???뚯씠釉?,
    typeCode: 'BBST02',
    icon: List,
    color: 'bg-emerald-500',
  },
  {
    id: 'TMPLT_GALLERY',
    name: 'Visual Gallery',
    description: '?대?吏 諛?移대뱶 以묒떖???쒓컖??而ㅻ??덊떚 ?덉씠?꾩썐',
    typeCode: 'BBST03',
    icon: ImageIcon,
    color: 'bg-rose-500',
  },
  {
    id: 'TMPLT_QNA',
    name: 'Professional Q&A',
    description: '吏덈Ц怨??닿껐 以묒떖???щ궡 湲곗닠 吏??諛??곷떞 ?덉씠?꾩썐',
    typeCode: 'BBST04',
    icon: HelpCircle,
    color: 'bg-amber-500',
  },
  {
    id: 'TMPLT_CALENDAR',
    name: 'Event Calendar',
    description: '?좎쭨 湲곕컲???꾩궗 ?쇱젙 諛?援먯쑁 ?꾪솴 愿由??덉씠?꾩썐',
    typeCode: 'BBST05',
    icon: CalendarDays,
    color: 'bg-cyan-500',
  },
  {
    id: 'TMPLT_FAQ',
    name: 'Accordion FAQ',
    description: '吏덈Ц怨??듬????쒕늿???쇱퀜蹂대뒗 ?꾩퐫?붿뼵 ?ㅽ??쇱쓽 FAQ ?덉씠?꾩썐',
    typeCode: 'BBST06',
    icon: MessageSquare,
    color: 'bg-purple-500',
  },
  {
    id: 'TMPLT_WIKI',
    name: 'Knowledge Wiki',
    description: '諛⑸????뺣낫瑜?泥닿퀎?곸쑝濡??뺣━?섎뒗 ?꾪걧癒쇳듃???꾪궎 ?덉씠?꾩썐',
    typeCode: 'BBST07',
    icon: Book,
    color: 'bg-slate-700',
  },
];

const ROLES = [
  { id: 'ROLE_ADMIN', name: '?쒖뒪??愿由ъ옄', icon: Lock, color: 'text-rose-500' },
  { id: 'ROLE_USER', name: '?쇰컲 ?꾩쭅??, icon: UserCircle, color: 'text-blue-500' },
  { id: 'ROLE_ANONYMOUS', name: '?듬챸 ?ъ슜??, icon: UserMinus, color: 'text-slate-400' },
];

const PERMISSIONS = [
  { id: 'list', name: '紐⑸줉 議고쉶' },
  { id: 'read', name: '湲 ?쎄린' },
  { id: 'write', name: '湲 ?곌린' },
  { id: 'comment', name: '?볤? ?묒꽦' },
];

const formSchema = z.object({
  bbsNm: z.string().min(2, '寃뚯떆??紐낆묶? 理쒖냼 2湲???댁긽?댁뼱???⑸땲??),
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
            <h2 className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white italic transition-colors">MISSION COMPLETE!</h2>
            <p className="text-xl text-slate-500 dark:text-slate-400 font-bold leading-relaxed max-w-md mx-auto transition-colors">
              寃뚯떆?먯씠 ?앹꽦?섏뿀?쇰ŉ <span className="text-primary">'{watch('menuNm')}'</span> 硫붾돱???깃났?곸쑝濡??곌껐?섏뿀?듬땲??
            </p>
          </div>
          <div className="flex flex-col gap-4 w-full max-w-sm">
            <Button
              onClick={() => router.push('/admin/community/boards/master')}
              className="h-16 rounded-[0.1rem] bg-primary text-xl font-black hover:scale-105 transition shadow-xl shadow-primary/20 italic tracking-tighter"
            >
              寃뚯떆??紐⑸줉 蹂닿린
            </Button>
            <Button
              variant="ghost"
              onClick={() => window.location.reload()}
              className="h-14 rounded-[0.1rem] text-slate-400 font-bold hover:text-primary transition-colors"
            >
              ?ㅻⅨ 寃뚯떆??異붽??섍린
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
                  "w-14 h-14 rounded-[0.1rem] flex items-center justify-center transition duration-500 border-4",
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
                <p className={cn("text-sm font-bold truncate max-w-[100px]", isActive ? "text-slate-900 dark:text-white" : "text-slate-400")}>
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
          <CardHeader className="bg-slate-50 dark:bg-slate-900 p-12 text-slate-900 dark:text-white relative border-b border-slate-100 dark:border-slate-800 transition-colors">
            <div className="space-y-2 relative z-10 text-left">
              <h3 className="text-4xl font-black tracking-tighter text-left">
                {STEPS[currentStep - 1].title}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-lg italic tracking-tight text-left transition-colors">
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
                        <Label htmlFor="bbsNm" className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 transition-colors">
                        <span className="w-1.5 h-6 bg-primary rounded-full inline-block" />
                        寃뚯떆??紐낆묶
                      </Label>
                      <Input
                        id="bbsNm"
                        autoFocus
                        placeholder="?? ?щ궡 ?뚯떇 怨듭쑀 寃뚯떆??
                        className={cn(
                          "h-16 text-xl rounded-[0.1rem] border-2 px-6 focus:ring-4 focus:ring-primary/10 transition font-bold shadow-inner-sm bg-white dark:bg-slate-950",
                          errors.bbsNm ? "border-red-500 bg-red-50/10" : "border-slate-200 dark:border-slate-800"
                        )}
                        {...register('bbsNm')}
                      />
                      {errors.bbsNm && <p className="text-red-500 text-sm font-bold ml-2">{errors.bbsNm.message}</p>}
                    </div>

                    <div className="space-y-4 text-left">
                      <Label htmlFor="bbsIntrcn" className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 transition-colors">
                        <span className="w-1.5 h-6 bg-slate-200 dark:bg-slate-700 rounded-full inline-block" />
                        寃뚯떆???뚭컻
                      </Label>
                      <Textarea
                        id="bbsIntrcn"
                        placeholder="寃뚯떆?먯쓽 紐⑹쟻怨??ъ슜 ??곸쓣 媛꾨떒???ㅻ챸?댁＜?몄슂."
                        className="min-h-[140px] text-lg rounded-[0.1rem] border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-6 py-4 focus:ring-4 focus:ring-primary/10 transition font-medium shadow-inner-sm text-left"
                        {...register('bbsIntrcn')}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                      <div className="flex items-center justify-between p-8 rounded-[0.1rem] border-2 border-slate-50 bg-slate-50/30 group hover:border-primary/20 transition text-left">
                        <div className="space-y-1 text-left">
                          <Label className="text-lg font-black text-slate-800 flex items-center gap-2">
                            ?볤? ?ъ슜 ?щ?
                            <Info className="w-4 h-4 text-slate-300" />
                          </Label>
                          <p className="text-xs text-slate-400 font-bold whitespace-nowrap">寃뚯떆湲???볤????묒꽦?????덈룄濡??⑸땲??</p>
                        </div>
                        <Switch
                          checked={watch('replyPosblAt')}
                          onCheckedChange={(checked) => setValue('replyPosblAt', checked)}
                          className="data-[state=checked]:bg-primary scale-125"
                        />
                      </div>

                      <div className="flex items-center justify-between p-8 rounded-[0.1rem] border-2 border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10 group hover:border-primary/20 transition text-left">
                        <div className="space-y-1 text-left">
                          <Label className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 transition-colors">
                            ?뚯씪 泥⑤? ?щ?
                            <Info className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                          </Label>
                          <p className="text-xs text-slate-400 font-bold whitespace-nowrap text-left transition-colors">臾몄꽌 諛??대?吏瑜?泥⑤??????덇쾶 ?⑸땲??</p>
                        </div>
                        <Switch
                          checked={watch('fileAtchPosblAt')}
                          onCheckedChange={(checked) => setValue('fileAtchPosblAt', checked)}
                          className="data-[state=checked]:bg-primary scale-125 transition-colors"
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
                        <p className="text-sm text-slate-400 font-bold tracking-tight text-left">鍮꾩쫰?덉뒪 紐⑹쟻??遺?⑺븯??理쒖쟻??UI ?붿옄?몄쓣 ?좏깮?섏꽭??</p>
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
                                "group relative p-8 rounded-[0.1rem] border-2 transition duration-500 cursor-pointer flex items-center gap-6",
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
                                "w-8 h-8 rounded-full border-2 flex items-center justify-center transition",
                                isSelected ? "bg-primary border-primary text-white" : "border-slate-200 text-transparent"
                              )}>
                                <Check size={16} strokeWidth={4} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="p-8 bg-slate-100 dark:bg-slate-950 rounded-[0.1rem] text-slate-400 dark:text-white/40 font-mono text-[10px] tracking-widest leading-relaxed text-left border border-slate-200 dark:border-slate-800 transition-colors">
                        ?붿옄??理쒖쟻???쒖꽦 <br />
                        UI ?뚮뜑留?紐⑤뱶: 怨좏빐?곷룄 <br />
                        ?쒗뵆由?ID: {selectedTemplate}
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
                              <th className="p-8 text-left font-black text-slate-400 text-sm tracking-widest uppercase">?ъ슜??洹몃９ (Roles)</th>
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
                                              "w-8 h-8 rounded-lg transition border-2",
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
                        <p className="font-black text-amber-900 text-lg text-left">蹂댁븞 ?뺤콉 ?덈궡</p>
                        <p className="text-sm text-slate-600 font-bold tracking-tight text-left">愿由ъ옄 洹몃９? 紐⑤뱺 沅뚰븳??湲곕낯?곸쑝濡?遺?щ맗?덈떎. ?듬챸 ?ъ슜?먯뿉寃??곌린 沅뚰븳??遺?ы븷 寃쎌슦 ?ㅽ뙵 寃뚯떆臾쇱뿉 二쇱쓽媛 ?꾩슂?⑸땲??</p>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="space-y-12 text-left">
                    <div className="space-y-6 text-left">
                      <Label className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-primary rounded-full inline-block" />
                        ?곸쐞 硫붾돱 ?좏깮
                      </Label>
                      <Select value={watch('upperMenuNo')} onValueChange={(val) => setValue('upperMenuNo', val)}>
                        <SelectTrigger className="h-20 rounded-[0.1rem] border-2 border-slate-100 bg-slate-50/50 px-8 text-xl font-black shadow-inner-sm text-left">
                          <SelectValue placeholder="?곸쐞 硫붾돱瑜??좏깮?섏꽭?? className="text-left" />
                        </SelectTrigger>
                        <SelectContent className="rounded-[0.1rem] border-none shadow-2xl">
                          <SelectItem value="2000000" className="py-4 text-lg font-bold">?묒뾽 而ㅻ??덊떚 諛?肄섑뀗痢?/SelectItem>
                          <SelectItem value="2030000" className="py-4 text-lg font-bold">?뺣낫?뱀뀡 諛??ъ슜?먯???/SelectItem>
                          <SelectItem value="0" className="py-4 text-lg font-bold">ROOT (理쒖긽??硫붾돱)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                      <div className="space-y-4 text-left">
                        <Label className="text-xl font-black text-slate-800 flex items-center gap-2">
                          硫붾돱 紐낆묶
                        </Label>
                        <Input
                          placeholder="硫붾돱???쒖떆???대쫫???낅젰?섏꽭??
                          className="h-16 text-lg rounded-[0.1rem] border-2 border-slate-100 bg-slate-50/50 px-6 font-bold shadow-inner-sm text-left"
                          {...register('menuNm')}
                        />
                      </div>
                      <div className="space-y-4 text-left">
                        <Label className="text-xl font-black text-slate-800 flex items-center gap-2 text-left">
                          硫붾돱 ?쒖꽌
                        </Label>
                        <Input
                          type="number"
                          className="h-16 text-lg rounded-[0.1rem] border-2 border-slate-100 bg-slate-50/50 px-6 font-bold shadow-inner-sm text-left"
                          {...register('menuOrdr', { valueAsNumber: true })}
                        />
                      </div>
                    </div>

                    <div className="p-10 rounded-[0.1rem] bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-none flex items-center justify-between group overflow-hidden relative text-left transition-colors">
                      <div className="space-y-2 relative z-10 text-left">
                        <p className="text-primary font-black tracking-widest text-[10px] uppercase text-left transition-colors">Generated Path</p>
                        <h5 className="text-2xl font-black tracking-tight flex items-center gap-3 text-left transition-colors">
                          /admin/community/boards/selectBoardList?bbsId=AUTO_GEN
                          <ExternalLink size={20} className="text-slate-400 dark:text-slate-600" />
                        </h5>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-bold tracking-tight italic text-left transition-colors">?앹꽦 利됱떆 硫붾돱 ?쒖뒪?쒖뿉 ?쒖꽦?붾맗?덈떎.</p>
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
              className="h-16 px-10 rounded-[0.1rem] font-black text-slate-600 hover:bg-white hover:text-slate-950 transition disabled:opacity-0 flex items-center gap-3 tracking-tighter"
            >
              <ChevronLeft className="w-6 h-6" /> ?댁쟾 ?④퀎
            </Button>

            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className={cn(
                "h-16 px-12 rounded-[0.1rem] font-black text-xl shadow-xl transition text-white min-w-[220px] tracking-tighter",
                currentStep === STEPS.length ? "bg-primary shadow-primary/30 hover:scale-105" : "bg-slate-900 dark:bg-primary hover:bg-slate-800 dark:hover:bg-primary/90"
              )}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-left font-black tracking-widest uppercase">{status || 'Processing..'}</span>
                </div>
              ) : (
                <span className="flex items-center gap-3">
                  {currentStep === STEPS.length ? '寃뚯떆???앹꽦 諛?硫붾돱 諛고룷' : '?ㅼ쓬 ?④퀎濡?}
                  <ChevronRight className="w-6 h-6" />
                </span>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <p className="text-center text-slate-400 text-[11px] font-black italic tracking-widest uppercase">
        "留덉?留??대┃???덈줈???뚰넻???쒖옉?낅땲?? - Board Master Maker v1.0
      </p>
    </div>
  );
}
