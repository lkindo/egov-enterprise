'use client';

import { useQuery } from '@tanstack/react-query';
import { getSurveyStats } from '@/lib/api/survey';
import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
 Card,
 CardContent,
 CardDescription,
 CardHeader,
 CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowLeft, BarChart3, PieChart, Activity } from 'lucide-react';

function StatsContent() {
 const searchParams = useSearchParams();
 const router = useRouter();
 const initialQestnrId = searchParams.get('qestnrId') || '';
 const [qestnrId, setQestnrId] = useState(initialQestnrId);

 const { data, isLoading, isError, error, refetch } = useQuery({
 queryKey: ['survey-stats', initialQestnrId],
 queryFn: () => getSurveyStats({ qestnrId: initialQestnrId, type: '1' }),
 enabled: !!initialQestnrId,
 retry: false,
 }) as any;

 const handleSearch = (e: React.FormEvent) => {
 e.preventDefault();
 router.push(`/survey/stats?qestnrId=${qestnrId}`);
 };

 return (
 <div className="container mx-auto py-8 max-w-5xl space-y-6">
 <div className="flex items-center space-x-4">
 <Button variant="ghost" size="icon" onClick={() => router.push('/survey/response')}>
 <ArrowLeft className="h-5 w-5" />
 </Button>
 <div>
 <h1 className="text-3xl font-bold tracking-tight">?¤ë¬¸ ê²°ê³¼ ?µê³„</h1>
 <p className="text-muted-foreground mt-1">
 ?¤ë¬¸ ì¡°ì‚¬ ê²°ê³¼ë¥??œê°?”í•˜??ë¶„ì„?©ë‹ˆ??
 </p>
 </div>
 </div>

 <Card className="shadow-sm border-primary/20">
 <CardHeader className="bg-primary/5">
 <CardTitle className="text-lg">?¤ë¬¸ì§€ ? íƒ</CardTitle>
 <CardDescription>?µê³„ë¥??•ì¸?˜ë ¤???¤ë¬¸ì§€ IDë¥??…ë ¥?˜ì„¸??</CardDescription>
 </CardHeader>
 <CardContent className="pt-6">
 <form onSubmit={handleSearch} className="flex gap-2">
 <Input
 placeholder="?¤ë¬¸ì§€ ID ?…ë ¥ (?? QUSTR_00000000000001)"
 value={qestnrId}
 onChange={(e) => setQestnrId(e.target.value)}
 className="max-w-md"
 />
 <Button type="submit">ì¡°íšŒ</Button>
 </form>
 </CardContent>
 </Card>

 {!initialQestnrId && (
 <div className="text-center py-20 border-2 border-dashed rounded-xl">
 <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
 <p className="text-muted-foreground">?¤ë¬¸ì§€ IDë¥??…ë ¥?˜ì—¬ ?µê³„ë¥??•ì¸?˜ì„¸??</p>
 </div>
 )}

 {isLoading && (
 <div className="flex justify-center py-20">
 <Loader2 className="h-8 w-8 animate-spin text-primary" />
 </div>
 )}

 {isError && (
 <Card className="border-destructive/20 bg-destructive/5 text-center py-10">
 <p className="text-destructive font-medium">?¤ë¥˜ ë°œìƒ: {error instanceof Error ? error.message : '?°ì´?°ë? ê°€?¸ì˜¤ì§€ ëª»í–ˆ?µë‹ˆ??'}</p>
 </Card>
 )}

 {data && (
 <div className="grid grid-cols-1 gap-6">
 {data.length === 0 ? (
 <div className="text-center py-10">?‘ë‹µ ?°ì´?°ê? ?†ìŠµ?ˆë‹¤.</div>
 ) : (
 data.map((stat: any, idx: number) => (
 <Card key={idx} className="shadow-sm overflow-hidden">
 <CardHeader className="bg-muted/30 border-b">
 <div className="flex items-center justify-between">
 <CardTitle className="text-md flex items-center">
 <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm mr-3">
 {idx + 1}
 </span>
 {stat.qestnCn}
 </CardTitle>
 <div className="text-sm font-semibold px-2 py-1 bg-blue-100 text-blue-700 rounded ">
 {stat.qestnTyCode === '1' ? 'ê°ê??? : 'ì£¼ê???}
 </div>
 </div>
 </CardHeader>
 <CardContent className="pt-6">
 <div className="space-y-4">
 <div className="flex justify-between text-sm mb-1">
 <span className="font-medium">{stat.iemCn || 'ì£¼ê????µë?'}</span>
 <span className="text-muted-foreground">{stat.respondCnt || 0} ëª?({stat.qustnrPercent || 0}%)</span>
 </div>
 <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
 <div
 className="bg-primary h-2.5 rounded-full transition-all duration-500"
 style={{ width: `${stat.qustnrPercent || 0}%` }}
 ></div>
 </div>
 </div>
 </CardContent>
 </Card>
 ))
 )}
 </div>
 )}
 </div>
 );
}

export default function SurveyStatsPage() {
 return (
 <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
 <StatsContent />
 </Suspense>
 );
}
