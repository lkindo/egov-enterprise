'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { IntelligenceMeetingPlanner } from '@/app/components/ui/intelligence-meeting-planner';
import { VisualOrganizationChart } from '@/app/components/ui/visual-organization-chart';
import { Button } from '@/components/ui/button';
import { Users, Calendar, MessageSquare, Newspaper, Star, Sparkles, Building2, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CollaborationHubPage() {
    const [activeTab, setActiveTab] = useState<'org' | 'meeting' | 'social'>('org');

    return (
        <div className="space-y-8 pb-20 animate-in fade-in duration-700">
            <PageHeader
                title="AI 협업 및 커뮤니케이션 허브"
                breadcrumbs={[{ label: '통합 관리' }, { label: '협업 지원' }]}
                actions={
                    <div className="flex bg-card/80 backdrop-blur-xl p-1.5 rounded-2xl border-2 border-primary/5 shadow-lg">
                        {[
                            { id: 'org', icon: <Building2 size={16} />, label: 'Organization' },
                            { id: 'meeting', icon: <Calendar size={16} />, label: 'Meeting Hub' },
                            { id: 'social', icon: <MessageSquare size={16} />, label: 'Social' },
                        ].map((tab) => (
                            <Button
                                key={tab.id}
                                variant={activeTab === tab.id ? "default" : "ghost"}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={cn(
                                    "rounded-xl font-black text-[10px] gap-2 h-10 px-5 transition-all uppercase tracking-widest",
                                    activeTab === tab.id ? "shadow-lg shadow-primary/20" : "hover:bg-primary/5"
                                )}
                            >
                                {tab.icon} {tab.label}
                            </Button>
                        ))}
                    </div>
                }
            />

            {/* Intelligence Banner */}
            <div className="p-10 rounded-[3.5rem] bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 text-white relative overflow-hidden group shadow-2xl">
                <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-1000">
                    <Sparkles size={260} />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-indigo-400">
                            <Star size={20} className="fill-current" />
                            <span className="text-xs font-black uppercase tracking-[0.3em] leading-none">Collaboration Intelligence v2.0</span>
                        </div>
                        <h3 className="text-4xl font-black tracking-tighter leading-none">
                            {activeTab === 'org' ? "Visual Organization Hierarchy" : activeTab === 'meeting' ? "Smart Resource & Meeting Hub" : "Knowledge & Communication"}
                        </h3>
                        <p className="text-sm text-slate-300 font-medium max-w-xl leading-relaxed">
                            {activeTab === 'org'
                                ? "전사 조직원의 구조와 실시간 상태 정보를 시각적으로 탐색하고 즉시 소통하세요. 계층 구조 기반의 직관적인 데이터 레이아웃을 제공합니다."
                                : activeTab === 'meeting'
                                    ? "지능형 타임라인 서비스를 통해 최적의 회의 공간을 탐색하고 예약하세요. 실시간 충돌 감지 및 리소스 분석 엔진이 탑재되어 있습니다."
                                    : "부서간 지식 공유와 소통을 위한 소셜 허브입니다. 새로운 소식과 업데이트된 지식 베이스를 확인하세요."}
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 text-center backdrop-blur-md">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2">Sync Rate</p>
                            <p className="text-3xl font-black">99.8%</p>
                        </div>
                        <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 text-center backdrop-blur-md">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2">Daily Active</p>
                            <p className="text-3xl font-black">842</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="min-h-[700px]">
                {activeTab === 'org' ? (
                    <VisualOrganizationChart />
                ) : activeTab === 'meeting' ? (
                    <IntelligenceMeetingPlanner />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in zoom-in-95 duration-700">
                        {[
                            { title: 'Wiki Database', items: 124, icon: <LayoutGrid className="text-blue-500" /> },
                            { title: 'Memo Reports', items: 45, icon: <Newspaper className="text-purple-500" /> },
                            { title: 'Announcements', items: 8, icon: <MessageSquare className="text-emerald-500" /> },
                        ].map((card, i) => (
                            <div key={i} className="p-8 bg-card border-2 border-primary/5 rounded-[3rem] shadow-xl group hover:border-primary/20 transition-all cursor-pointer">
                                <div className="w-16 h-16 rounded-2xl bg-slate-50 border flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    {card.icon}
                                </div>
                                <h4 className="text-xl font-black tracking-tight mb-2">{card.title}</h4>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6 opacity-60">{card.items} New entries today</p>
                                <Button variant="outline" className="w-full rounded-2xl h-12 font-black text-[10px] uppercase tracking-widest border-2">Explore Module</Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}