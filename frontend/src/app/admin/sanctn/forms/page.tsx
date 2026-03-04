'use client';

import React, { useState } from 'react';
import { SmartFormBuilder } from '@/app/components/ui/smart-form-builder';
import { SmartFormRenderer } from '@/app/components/ui/smart-form-renderer';
import { PageHeader } from '@/app/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Layers, Play, Settings2, FileText, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/app/components/ui/toast';

export default function SmartFormDesignerPage() {
    const [activeTab, setActiveTab] = useState<'build' | 'preview'>('build');
    const { toast } = useToast();

    const mockSchema = {
        title: "Intelligence 행정 보고서",
        description: "AI 기반 데이터 분석을 위한 표준 서식 레이아웃입니다.",
        fields: [
            { id: 'f1', type: 'text' as const, label: '프로젝트명', placeholder: '프로젝트 정식 명칭을 입력하세요', required: true, width: 'full' as const },
            { id: 'f2', type: 'date' as const, label: '개시 일자', required: true, width: 'half' as const },
            { id: 'f3', type: 'select' as const, label: '우선순위', options: ['High', 'Medium', 'Low'], width: 'half' as const },
            { id: 'f4', type: 'textarea' as const, label: '상세 전략', placeholder: '핵심 전략 및 마일스톤을 기술하세요', width: 'full' as const },
            { id: 'f5', type: 'checkbox' as const, label: '보안 준수 동의', placeholder: '정보 보안 가이드라인을 정독하고 준수함에 동의합니다.', required: true, width: 'full' as const }
        ]
    };

    return (
        <div className="space-y-8 pb-20 animate-in fade-in duration-700">
            <PageHeader
                title="스마트 서식 엔진"
                breadcrumbs={[{ label: '행정 지원' }, { label: '서식 관리' }]}
                actions={
                    <div className="flex bg-muted/50 p-1.5 rounded-2xl border border-primary/5">
                        <Button
                            variant={activeTab === 'build' ? "default" : "ghost"}
                            onClick={() => setActiveTab('build')}
                            className="rounded-xl font-black text-[10px] gap-2 h-10 px-5 transition-all uppercase tracking-widest"
                        >
                            <Settings2 size={16} /> Designer
                        </Button>
                        <Button
                            variant={activeTab === 'preview' ? "default" : "ghost"}
                            onClick={() => setActiveTab('preview')}
                            className="rounded-xl font-black text-[10px] gap-2 h-10 px-5 transition-all uppercase tracking-widest"
                        >
                            <Play size={16} /> Deploy Preview
                        </Button>
                    </div>
                }
            />

            {/* Control Banner */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-3 p-8 rounded-[2.5rem] bg-gradient-to-br from-primary/10 via-background to-purple-500/5 border-2 border-primary/5 shadow-inner relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform">
                        <Layers size={200} className="text-primary" />
                    </div>
                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-2 text-primary">
                            <FileText size={18} />
                            <span className="text-xs font-black uppercase tracking-[0.2em]">Form Protocol v1.0</span>
                        </div>
                        <h3 className="text-3xl font-black tracking-tighter">
                            {activeTab === 'build' ? "Dynamic Form Designer" : "Enterprise Deployment Preview"}
                        </h3>
                        <p className="text-sm text-muted-foreground font-medium max-w-xl">
                            {activeTab === 'build'
                                ? "드래그 앤 드롭과 지능형 속성 편집기를 사용하여 코딩 없이 복잡한 행정 서식을 설계하세요."
                                : "설계된 서식이 실제 사용자에게 어떻게 보여지는지 확인하고 유효성 검사 로직을 테스트합니다."}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="flex-1 p-6 rounded-[2rem] bg-card border-2 border-primary/5 flex flex-col justify-between shadow-sm">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Active Schema</p>
                        <div className="space-y-1">
                            <h4 className="text-lg font-black tracking-tight">{mockSchema.title}</h4>
                            <div className="flex items-center gap-2 text-emerald-500">
                                <CheckCircle2 size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Ready to Deploy</span>
                            </div>
                        </div>
                    </div>
                    <Button className="h-16 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all">
                        Publish to Production
                    </Button>
                </div>
            </div>

            <div className="min-h-[600px] border-2 border-primary/5 rounded-[3.5rem] bg-slate-50/30 overflow-hidden shadow-2xl">
                {activeTab === 'build' ? (
                    <SmartFormBuilder />
                ) : (
                    <div className="p-20 flex justify-center items-start">
                        <SmartFormRenderer
                            className="max-w-4xl w-full"
                            schema={mockSchema}
                            onSubmit={(data) => {
                                console.log("Form Data Submitted:", data);
                                toast("영수증이 성공적으로 제출되었습니다.", "success");
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}