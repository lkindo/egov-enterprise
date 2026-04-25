'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutGrid, BarChart3, HelpCircle, Users, FileStack, Settings2 } from "lucide-react";

// Components extracted from existing pages (for now we will put placeholders or import if possible)
import PollManagePage from '../manage/page';
import SurveyStatsPage from '../stats/page';

export function SurveyHubClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'manage';

  const onTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', value);
    router.push(`/admin/survey/hub?${params.toString()}`, { scroll: false });
  };

  return (
    <Tabs value={currentTab} onValueChange={onTabChange} className="space-y-8">
      <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100 shadow-sm inline-flex">
        <TabsList className="bg-transparent gap-2 h-auto p-0 border-none">
          <TabsTrigger value="manage" className="data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary rounded-xl h-12 px-6 font-bold text-xs gap-2 transition-all">
            <LayoutGrid size={16} /> 설문 관리
          </TabsTrigger>
          <TabsTrigger value="stats" className="data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary rounded-xl h-12 px-6 font-bold text-xs gap-2 transition-all">
            <BarChart3 size={16} /> 결과 통계
          </TabsTrigger>
          <TabsTrigger value="questions" className="data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary rounded-xl h-12 px-6 font-bold text-xs gap-2 transition-all">
            <HelpCircle size={16} /> 질문/문항
          </TabsTrigger>
          <TabsTrigger value="respondents" className="data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary rounded-xl h-12 px-6 font-bold text-xs gap-2 transition-all">
            <Users size={16} /> 응답 그룹
          </TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary rounded-xl h-12 px-6 font-bold text-xs gap-2 transition-all">
            <FileStack size={16} /> 템플릿 관리
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary rounded-xl h-12 px-6 font-bold text-xs gap-2 transition-all">
            <Settings2 size={16} /> 연동 설정
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="manage" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
        <PollManagePage />
      </TabsContent>

      <TabsContent value="stats" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
        <SurveyStatsPage />
      </TabsContent>

      <TabsContent value="questions" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
        <PlaceholderCard title="질문 및 문항 라이브러리" description="설문 구성을 위한 핵심 질문 및 선택지 구조를 관리합니다." icon={HelpCircle} />
      </TabsContent>

      <TabsContent value="respondents" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
        <PlaceholderCard title="응답 그룹 관리" description="설문 조사 대상인 사용자 집단 및 세그먼트를 정의합니다." icon={Users} />
      </TabsContent>

      <TabsContent value="templates" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
        <PlaceholderCard title="설문 템플릿 관리" description="표준화된 설문 양식을 생성하고 재사용 가능한 설문 세트를 관리합니다." icon={FileStack} />
      </TabsContent>

       <TabsContent value="settings" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
        <PlaceholderCard title="대외 기관 연동 설정" description="시스템 간의 설문 데이터 연동 프로토콜을 관리합니다." icon={Settings2} />
      </TabsContent>
    </Tabs>
  );
}

function PlaceholderCard({ title, description, icon: Icon }: any) {
  return (
    <Card className="border-none shadow-none bg-slate-50/50 rounded-xl p-12 flex flex-col items-center justify-center text-center space-y-6">
      <div className="w-20 h-20 rounded-xl bg-white shadow-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
        <Icon size={32} />
      </div>
      <div className="space-y-2">
        <CardTitle className="text-2xl font-black tracking-tighter">{title}</CardTitle>
        <CardDescription className="text-sm font-medium">{description}</CardDescription>
      </div>
      <div className="flex gap-4">
        <div className="h-2 w-2 rounded-full bg-primary/20 animate-pulse" />
        <div className="h-2 w-2 rounded-full bg-primary/40 animate-pulse delay-75" />
        <div className="h-2 w-2 rounded-full bg-primary/20 animate-pulse delay-150" />
      </div>
    </Card>
  );
}
