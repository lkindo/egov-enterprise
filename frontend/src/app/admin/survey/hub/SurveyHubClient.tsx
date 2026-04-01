'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutGrid, BarChart3, HelpCircle, Users, FileStack, Settings2 } from "lucide-react";

// Components extracted from existing pages (for now we will put placeholders or import if possible)
// In a real scenario, we should move the Logic from manage/page.tsx, stats/page.tsx to shared components.
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
      <div className="bg-slate-50/50 p-2 rounded-[1.5rem] border border-slate-100 shadow-sm inline-flex">
        <TabsList className="bg-transparent gap-2 h-auto p-0 border-none">
          <TabsTrigger value="manage" className="data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary rounded-xl h-12 px-6 font-bold text-xs gap-2 transition-all">
            <LayoutGrid size={16} /> 설문 愿由?          </TabsTrigger>
          <TabsTrigger value="stats" className="data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary rounded-xl h-12 px-6 font-bold text-xs gap-2 transition-all">
            <BarChart3 size={16} /> 寃곌낵 통계
          </TabsTrigger>
          <TabsTrigger value="questions" className="data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary rounded-xl h-12 px-6 font-bold text-xs gap-2 transition-all">
            <HelpCircle size={16} /> 吏덈Ц/臾명빆
          </TabsTrigger>
          <TabsTrigger value="respondents" className="data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary rounded-xl h-12 px-6 font-bold text-xs gap-2 transition-all">
            <Users size={16} /> ?묐떟님洹몃９
          </TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary rounded-xl h-12 px-6 font-bold text-xs gap-2 transition-all">
            <FileStack size={16} /> ?쒗뵆由?愿由?          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary rounded-xl h-12 px-6 font-bold text-xs gap-2 transition-all">
            <Settings2 size={16} /> ?곕룞 ?ㅼ젙
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
        <PlaceholderCard title="吏덈Ц 諛?臾명빆 ?쇱씠釉뚮윭由? description="설문님?ы븿님?듭떖 吏덈Ц怨님좏깮 님ぉ님援ъ“?뷀븯님愿由ы빀?덈떎." icon={HelpCircle} />
      </TabsContent>

      <TabsContent value="respondents" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
        <PlaceholderCard title="?묐떟님洹몃９ 愿由? description="설문 조사님??곸씠 님?ъ슜님吏묐떒 諛님멸렇癒쇳듃瑜님뺤쓽?⑸땲님" icon={Users} />
      </TabsContent>

      <TabsContent value="templates" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
        <PlaceholderCard title="설문 ?쒗뵆由님쒖뒪님 description="?쒖님붾맂 설문 ?묒떇님?앹꽦?섍퀬 ?ъ궗님媛?ν븳 紐낆꽭瑜?愿由ы빀?덈떎." icon={FileStack} />
      </TabsContent>

       <TabsContent value="settings" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
        <PlaceholderCard title="??멸린愿 ?곕룞 ?ㅼ젙" description="?몃? ?ы꽭?대굹 ? ?쒖뒪?쒓낵님설문 ?곗씠님?곕룞 ?꾨줈?좎퐳님愿由ы빀?덈떎." icon={Settings2} />
      </TabsContent>
    </Tabs>
  );
}

function PlaceholderCard({ title, description, icon: Icon }: any) {
  return (
    <Card className="border-none shadow-none bg-slate-50/50 rounded-[2rem] p-12 flex flex-col items-center justify-center text-center space-y-6">
      <div className="w-20 h-20 rounded-[2rem] bg-white shadow-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
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

