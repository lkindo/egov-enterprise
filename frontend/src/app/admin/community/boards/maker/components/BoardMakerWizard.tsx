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
  Settings2,
  Info,
  List,
  ImageIcon,
  BookOpen,
  UserCircle,
  UserMinus,
  Lock,
  ExternalLink,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { menuAdminService } from '@/services/foundation/system/MenuAdminService';

const STEPS = [
  { id: 1, title: 'ê¸°ë³¸ ?¤ì •', description: 'ê²Œì‹œ?ì˜ ?´ë¦„ê³??¤ëª…???…ë ¥?˜ì„¸??', icon: Settings2 },
  { id: 2, title: '?œí”Œë¦?? íƒ', description: '?©ë„??ë§ëŠ” UI ?¤í??¼ì„ ? íƒ?˜ì„¸??', icon: Layout },
  { id: 3, title: 'ê¶Œí•œ ë§¤íŠ¸ë¦?Š¤', description: '?¬ìš©??ê·¸ë£¹ë³?ê¶Œí•œ???¤ì •?˜ì„¸??', icon: ShieldCheck },
  { id: 4, title: 'ë©”ë‰´ ë°°í¬', description: '?¬ì´??ë©”ë‰´??ê²Œì‹œ?ì„ ?°ê²°?˜ì„¸??', icon: Rocket },
];

const TEMPLATES = [
  {
    id: 'TMPLT_HUB',
    name: 'ì§€???ˆë¸Œ',
    description: 'ì§€??ê³µìœ ??ìµœì ?”ëœ ê³ ë„???€?œë³´?œí˜• ?ˆì´?„ì›ƒ',
    typeCode: 'BBST01',
    icon: BookOpen,
    color: 'bg-indigo-500',
  },
  {
    id: 'TMPLT_LIST',
    name: 'Enterprise List',
    description: 'ë¹ ë¥¸ ?ìƒ‰ê³?ê°€?…ì„±??ì¤‘ì‹œ?˜ëŠ” ?œì? ?°ì´???Œì´ë¸?,
    typeCode: 'BBST02',
    icon: List,
    color: 'bg-emerald-500',
  },
  {
    id: 'TMPLT_GALLERY',
    name: 'Visual Gallery',
    description: '?´ë?ì§€ ë°?ì¹´ë“œ ì¤‘ì‹¬???œê°??ì»¤ë??ˆí‹° ?ˆì´?„ì›ƒ',
    typeCode: 'BBST03',
    icon: ImageIcon,
    color: 'bg-rose-500',
  },
];

const ROLES = [
  { id: 'ROLE_ADMIN', name: '?œìŠ¤??ê´€ë¦¬ì', icon: Lock, color: 'text-rose-500' },
  { id: 'ROLE_USER', name: '?¼ë°˜ ?„ì§??, icon: UserCircle, color: 'text-blue-500' },
  { id: 'ROLE_ANONYMOUS', name: '?µëª… ?¬ìš©??, icon: UserMinus, color: 'text-slate-400' },
];

const PERMISSIONS = [
  { id: 'list', name: 'ëª©ë¡ ì¡°íšŒ' },
  { id: 'read', name: 'ê¸€ ?½ê¸°' },
  { id: 'write', name: 'ê¸€ ?°ê¸°' },
  { id: 'comment', name: '?“ê? ?‘ì„±' },
];

const formSchema = z.object({
  bbsNm: z.string().min(2, 'ê²Œì‹œ??ëª…ì¹­?€ ìµœì†Œ 2ê¸€???´ìƒ?´ì–´???©ë‹ˆ??'),
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
    } catch {
      console.error('Validation/Submission Error:', error);
      setStatus("Failed to reconcile system state.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <Card className="max-w-3xl mx-auto border-none shadow-2xl rounded-[3.5rem] overflow-hidden bg-white mt-10">
        <CardContent className="p-20 flex flex-col items-center text-center gap-10">
          <div className="w-32 h-32 rounded-full bg-green-500 flex items-center justify-center text-white animate-bounce-short">
            <Check size={64} strokeWidth={4} />
          </div>
          <div className="space-y-4">
            <h2 className="text-5xl font-black tracking-tighter text-slate-900 italic">MISSION COMPLETE!</h2>
            <p className="text-xl text-slate-400 font-bold leading-relaxed max-w-md mx-auto">
              ê²Œì‹œ?ì´ ?ì„±?˜ì—ˆ?¼ë©° <span className="text-primary">'{watch('menuNm')}'</span> ë©”ë‰´???±ê³µ?ìœ¼ë¡??°ê²°?˜ì—ˆ?µë‹ˆ??
            </p>
          </div>
          <div className="flex flex-col gap-4 w-full max-w-sm">
            <Button
              onClick={() => router.push('/admin/community/boards/master')}
              className="h-16 rounded-2xl bg-primary text-xl font-black hover:scale-105 transition-all shadow-xl shadow-primary/20 italic tracking-tighter"
            >
              ê²Œì‹œ??ëª©ë¡ ë³´ê¸°
            </Button>
            <Button
              variant="ghost"
              onClick={() => window.location.reload()}
              className="h-14 rounded-2xl text-slate-400 font-bold hover:text-primary transition-colors"
            >
              ?¤ë¥¸ ê²Œì‹œ??ì¶”ê??˜ê¸°
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
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
                  "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 border-4",
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
      <Card className="border-none shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] rounded-[3rem] overflow-hidden bg-white/80 backdrop-blur-xl ring-1 ring-slate-200/50">
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardHeader className="bg-slate-900 p-12 text-white relative">
            <div className="space-y-2 relative z-10">
              <h3 className="text-4xl font-black tracking-tighter">
                {STEPS[currentStep - 1].title}
              </h3>
              <p className="text-slate-400 font-medium text-lg italic tracking-tight">
                {STEPS[currentStep - 1].description}
              </p>
            </div>
            <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-10 select-none pointer-events-none">
              {React.createElement(STEPS[currentStep - 1].icon, { size: 120 })}
            </div>
          </CardHeader>

          <CardContent className="p-12 min-h-[550px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {currentStep === 1 && (
                  <div className="space-y-10">
                    <div className="space-y-4">
                      <Label htmlFor="bbsNm" className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-primary rounded-full inline-block" />
                        ê²Œì‹œ??ëª…ì¹­
                      </Label>
                      <Input
                        id="bbsNm"
                        placeholder="?? ?¬ë‚´ ?Œì‹ ê³µìœ  ê²Œì‹œ??
                        className={cn(
                          "h-16 text-xl rounded-2xl border-2 px-6 focus:ring-4 focus:ring-primary/10 transition-all font-bold shadow-inner-sm",
                          errors.bbsNm ? "border-red-500 bg-red-50/10" : "border-slate-100 bg-slate-50/50"
                        )}
                        {...register('bbsNm')}
                      />
                      {errors.bbsNm && <p className="text-red-500 text-sm font-bold ml-2">{errors.bbsNm.message}</p>}
                    </div>

                    <div className="space-y-4">
                      <Label htmlFor="bbsIntrcn" className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-slate-300 rounded-full inline-block" />
                        ê²Œì‹œ???Œê°œ
                      </Label>
                      <Textarea
                        id="bbsIntrcn"
                        placeholder="ê²Œì‹œ?ì˜ ëª©ì ê³??¬ìš© ?€?ì„ ê°„ë‹¨???¤ëª…?´ì£¼?¸ìš”."
                        className="min-h-[140px] text-lg rounded-3xl border-2 border-slate-100 bg-slate-50/50 px-6 py-4 focus:ring-4 focus:ring-primary/10 transition-all font-medium shadow-inner-sm"
                        {...register('bbsIntrcn')}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                      <div className="flex items-center justify-between p-8 rounded-[2rem] border-2 border-slate-50 bg-slate-50/30 group hover:border-primary/20 transition-all">
                        <div className="space-y-1">
                          <Label className="text-lg font-black text-slate-800 flex items-center gap-2">
                            ?“ê? ?¬ìš© ?¬ë?
                            <Info className="w-4 h-4 text-slate-300" />
                          </Label>
                          <p className="text-sm text-slate-400 font-medium whitespace-nowrap">ê²Œì‹œê¸€???“ê????‘ì„±?????ˆìŠµ?ˆë‹¤.</p>
                        </div>
                        <Switch
                          checked={watch('replyPosblAt')}
                          onCheckedChange={(checked) => setValue('replyPosblAt', checked)}
                          className="data-[state=checked]:bg-primary scale-125"
                        />
                      </div>

                      <div className="flex items-center justify-between p-8 rounded-[2rem] border-2 border-slate-50 bg-slate-50/30 group hover:border-primary/20 transition-all">
                        <div className="space-y-1">
                          <Label className="text-lg font-black text-slate-800 flex items-center gap-2">
                            ?Œì¼ ì²¨ë? ?¬ë?
                            <Info className="w-4 h-4 text-slate-300" />
                          </Label>
                          <p className="text-sm text-slate-400 font-medium whitespace-nowrap">ë¬¸ì„œ???´ë?ì§€ë¥?ì²¨ë??????ˆìŠµ?ˆë‹¤.</p>
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
                  <div className="flex flex-col lg:flex-row gap-12">
                    <div className="flex-1 space-y-8">
                      <div className="space-y-2">
                        <h4 className="text-xl font-black text-slate-800 tracking-tight italic">LAYOUT_STRATEGY_SELECT</h4>
                        <p className="text-sm text-slate-400 font-medium">ë¹„ì¦ˆ?ˆìŠ¤ ëª©ì ??ë¶€?©í•˜??ìµœì ??UI ?”ì§„??? íƒ?˜ì„¸??</p>
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
                                "group relative p-8 rounded-[2.5rem] border-2 transition-all duration-500 cursor-pointer flex items-center gap-6",
                                isSelected ? "border-primary bg-primary/5 ring-4 ring-primary/10 shadow-xl" : "border-slate-50 bg-slate-50/30 hover:border-slate-200"
                              )}
                            >
                              <div className={cn(
                                "w-16 h-16 rounded-2xl flex items-center justify-center text-white transition-transform group-hover:scale-110 group-hover:rotate-3 shadow-lg",
                                tpl.color
                              )}>
                                <Icon size={32} />
                              </div>

                              <div className="flex-1 space-y-1">
                                <h4 className="text-xl font-black text-slate-800 tracking-tight">
                                  {tpl.name}
                                </h4>
                                <p className="text-[11px] text-slate-500 font-bold leading-relaxed">
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
                      <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white/40 font-mono text-[10px] tracking-widest leading-relaxed">
                        ?”ì§„ ìµœì ?? ?œì„± <br />
                        UI ?Œë”ë§?ëª¨ë“œ: ê³ ì¶©?¤ë„ <br />
                        ?œí”Œë¦?ID: {selectedTemplate}
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
                  <div className="space-y-8">
                    <div className="rounded-[2.5rem] border-2 border-slate-50 overflow-hidden shadow-inner bg-slate-50/30">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[800px]">
                          <thead>
                            <tr className="bg-slate-900/5 border-b">
                              <th className="p-8 text-left font-black text-slate-400 text-sm tracking-widest uppercase">?€??ê·¸ë£¹ (Roles)</th>
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
                                    <div className="flex items-center gap-4">
                                      <div className={cn("p-3 rounded-2xl bg-white shadow-sm border border-slate-100 shadow-inner-sm", role.color)}>
                                        <RoleIcon size={24} />
                                      </div>
                                      <div>
                                        <p className="font-black text-slate-800 text-lg">{role.name}</p>
                                        <p className="text-xs text-slate-400 font-bold uppercase">{role.id}</p>
                                      </div>
                                    </div>
                                  </td>
                                  {PERMISSIONS.map(perm => {
                                    const isChecked = rolePerms.includes(perm.id);
                                    return (
                                      <td key={perm.id} className="p-8 text-center">
                                        <Checkbox
                                          checked={isChecked}
                                          onCheckedChange={() => togglePermission(role.id, perm.id)}
                                          className={cn(
                                            "w-8 h-8 rounded-lg transition-all border-2",
                                            isChecked ? "bg-primary border-primary text-white scale-110 shadow-lg shadow-primary/20" : "bg-white border-slate-200"
                                          )}
                                        />
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

                    <div className="p-8 bg-amber-50 rounded-[2rem] border-2 border-amber-100 flex items-start gap-4 shadow-sm">
                      <Info className="w-8 h-8 text-amber-500 shrink-0" />
                      <div>
                        <p className="font-black text-amber-900 text-lg">ë³´ì•ˆ ?•ì±… ?ˆë‚´</p>
                        <p className="text-slate-600 font-medium">ê´€ë¦¬ì ê·¸ë£¹?€ ëª¨ë“  ê¶Œí•œ??ê¸°ë³¸?ìœ¼ë¡?ë¶€?¬ë©?ˆë‹¤. '?µëª… ?¬ìš©???ê²Œ ?°ê¸° ê¶Œí•œ??ë¶€?¬í•  ê²½ìš° ?¤íŒ¸ ê²Œì‹œë¬¼ì— ì£¼ì˜ê°€ ?„ìš”?©ë‹ˆ??</p>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="space-y-12">
                    <div className="space-y-6">
                      <Label className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-primary rounded-full inline-block" />
                        ?ìœ„ ë©”ë‰´ ? íƒ
                      </Label>
                      <Select value={watch('upperMenuNo')} onValueChange={(val) => setValue('upperMenuNo', val)}>
                        <SelectTrigger className="h-20 rounded-3xl border-2 border-slate-100 bg-slate-50/50 px-8 text-xl font-black shadow-inner-sm">
                          <SelectValue placeholder="?ìœ„ ë©”ë‰´ë¥?? íƒ?˜ì„¸??" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                          <SelectItem value="2000000" className="py-4 text-lg font-bold">?‘ì—… ì»¤ë??ˆí‹° ë°?ì½˜í…ì¸?/SelectItem>
                          <SelectItem value="2030000" className="py-4 text-lg font-bold">?ë³´?¹ì…˜ ë°??¬ìš©?ì???/SelectItem>
                          <SelectItem value="0" className="py-4 text-lg font-bold">ROOT (ìµœìƒ??ë©”ë‰´)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <Label className="text-xl font-black text-slate-800 flex items-center gap-2">
                          ë©”ë‰´ ëª…ì¹­
                        </Label>
                        <Input
                          placeholder="ë©”ë‰´???œì‹œ???´ë¦„???…ë ¥?˜ì„¸??"
                          className="h-16 text-lg rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-6 font-bold shadow-inner-sm"
                          {...register('menuNm')}
                        />
                      </div>
                      <div className="space-y-4">
                        <Label className="text-xl font-black text-slate-800 flex items-center gap-2">
                          ë©”ë‰´ ?œì„œ
                        </Label>
                        <Input
                          type="number"
                          className="h-16 text-lg rounded-2xl border-2 border-slate-100 bg-slate-50/50 px-6 font-bold shadow-inner-sm"
                          {...register('menuOrdr', { valueAsNumber: true })}
                        />
                      </div>
                    </div>

                    <div className="p-10 rounded-[3rem] bg-slate-900 text-white flex items-center justify-between group overflow-hidden relative">
                      <div className="space-y-2 relative z-10">
                        <p className="text-primary font-black tracking-widest text-xs uppercase">Generated Path</p>
                        <h5 className="text-2xl font-black tracking-tight flex items-center gap-3">
                          /admin/community/boards/selectBoardList?bbsId=AUTO_GEN
                          <ExternalLink size={20} className="text-slate-600" />
                        </h5>
                        <p className="text-slate-400 text-sm font-medium italic">?ì„± ì¦‰ì‹œ ë©”ë‰´ ?œìŠ¤?œì— ?œì„±?”ë©?ˆë‹¤.</p>
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

          <CardFooter className="p-10 bg-slate-50/50 border-t flex justify-between items-center">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={prevStep}
              disabled={currentStep === 1 || isSubmitting}
              className="h-14 px-8 rounded-2xl font-black text-slate-600 hover:bg-white hover:text-primary transition-all disabled:opacity-0"
            >
              <ChevronLeft className="mr-2 w-5 h-5" /> ?´ì „ ?¨ê³„
            </Button>

            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className={cn(
                "h-14 px-10 rounded-2xl font-black text-lg shadow-xl transition-all text-white min-w-[180px]",
                currentStep === STEPS.length ? "bg-primary shadow-primary/30 hover:scale-105" : "bg-slate-800 hover:bg-slate-700"
              )}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {status || 'ì²˜ë¦¬ ì¤?..'}
                </div>
              ) : (
                <span className="flex items-center gap-2">
                  {currentStep === STEPS.length ? 'ê²Œì‹œ???ì„± ë°?ë©”ë‰´ ë°°í¬' : '?¤ìŒ ?¨ê³„ë¡?}
                  <ChevronRight className="ml-2 w-5 h-5" />
                </span>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <p className="text-center text-slate-400 text-sm font-medium italic">
        "ë§ˆì?ë§??´ë¦­???ˆë¡œ???Œí†µ???œì‘?…ë‹ˆ?? - Board Master Maker v1.0
      </p>
    </div>
  );
}
