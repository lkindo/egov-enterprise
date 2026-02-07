'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  CalendarCheck,
  CheckSquare,
  FileText,
  LayoutDashboard,
  MoreHorizontal,
  Vote
} from "lucide-react";
import { getPollList } from '@/services/poll/pollService';
import { OnlinePollManageVO } from '@/types/poll';
import axios from '@/lib/api/client';

interface BoardItem {
  nttId: number;
  nttSj: string;
  frstRegisterNm: string;
  frstRegisterPnttmStr: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [taskList, setTaskList] = useState<BoardItem[]>([]);
  const [notiList, setNotiList] = useState<BoardItem[]>([]);
  const [activePoll, setActivePoll] = useState<OnlinePollManageVO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      // 1. Fetch Board Data (Legacy Dashboard API or separate calls)
      // Trying legacy endpoint first as seen in previous code
      try {
        // If this fails, we might need to use boardService directly
        // Assuming the backend endpoint /api/v1/dashboard exists or /dashboard is proxied
        const dashboardRes = await axios.get('/dashboard').catch(() => null);

        if (dashboardRes && dashboardRes.data.success) {
          setTaskList(dashboardRes.data.taskList || []);
          setNotiList(dashboardRes.data.notiList || []);
        } else {
          // Fallback: Fetch directly if /dashboard fails (Example structure)
          // const notiRes = await getBoardList('BBSMSTR_AAAAAAAAAAAA');
        }
      } catch (e) {
        console.error("Dashboard fetch error", e);
      }

      // 2. Fetch Active Polls
      try {
        const pollRes = await getPollList({ pageIndex: 1 });
        if (pollRes && pollRes.resultList) {
          const today = new Date().toISOString().slice(0, 10);
          const active = pollRes.resultList.find(p =>
            p.pollBeginDe <= today && p.pollEndDe >= today
          );
          setActivePoll(active || null);
        }
      } catch (e) {
        console.error("Poll fetch error", e);
      }

      setLoading(false);
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            환영합니다, <span className="font-semibold text-primary">{user?.name || '사용자'}</span>님. 오늘의 업무 현황입니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/cop/smt/sdm')}>
            <CalendarCheck className="mr-2 h-4 w-4" /> 일정관리
          </Button>
          <Button variant="outline" onClick={() => router.push('/uss/ion/rwd')}>
            <CheckSquare className="mr-2 h-4 w-4" /> 전자결재
          </Button>
        </div>
      </div>

      {/* Quick Stats / Active Poll */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="pb-2">
            <CardDescription className="text-primary-foreground/80">진행 중인 업무</CardDescription>
            <CardTitle className="text-4xl">12</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs opacity-80">+2 건이 오늘 추가됨</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>읽지 않은 공지</CardDescription>
            <CardTitle className="text-4xl">3</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">최신 공지사항 확인 필요</div>
          </CardContent>
        </Card>

        {/* Poll Widget */}
        <Card className="col-span-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Vote size={120} />
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Vote className="h-5 w-5" /> 진행 중인 설문
            </CardTitle>
            <CardDescription>여러분의 의견을 들려주세요</CardDescription>
          </CardHeader>
          <CardContent>
            {activePoll ? (
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">{activePoll.pollNm}</h3>
                <div className="text-sm text-muted-foreground">
                  기간: {activePoll.pollBeginDe} ~ {activePoll.pollEndDe}
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">현재 진행 중인 설문이 없습니다.</div>
            )}
          </CardContent>
          {activePoll && (
            <CardFooter>
              <Button size="sm" onClick={() => router.push(`/survey/${activePoll.pollId}`)}>
                참여하기
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">

        {/* Notices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" /> 공지사항
              </CardTitle>
              <CardDescription>최신 업무 공지</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/cop/bbs/selectBoardList?bbsId=BBSMSTR_AAAAAAAAAAAA">더보기</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 animate-pulse rounded" />)}
              </div>
            ) : (
              <div className="space-y-1">
                {notiList.length > 0 ? (
                  notiList.map((item) => (
                    <div key={item.nttId} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded group">
                      <Link href={`/cop/bbs/selectBoardArticle/${item.nttId}?bbsId=BBSMSTR_AAAAAAAAAAAA`} className="truncate flex-1 font-medium group-hover:text-primary transition-colors">
                        {item.nttSj}
                      </Link>
                      <span className="text-xs text-muted-foreground ml-4 shrink-0">{item.frstRegisterPnttmStr}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">등록된 공지사항이 없습니다.</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" /> 오늘의 할일
              </CardTitle>
              <CardDescription>부서 업무 게시판</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/cop/bbs/selectBoardList?bbsId=BBSMSTR_CCCCCCCCCCCC">더보기</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 animate-pulse rounded" />)}
              </div>
            ) : (
              <div className="space-y-1">
                {taskList.length > 0 ? (
                  taskList.map((item) => (
                    <div key={item.nttId} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded group">
                      <Link href={`/cop/bbs/selectBoardArticle/${item.nttId}?bbsId=BBSMSTR_CCCCCCCCCCCC`} className="truncate flex-1 group-hover:text-primary transition-colors">
                        {item.nttSj}
                      </Link>
                      <Badge variant="outline" className="ml-2 text-xs font-normal">
                        {item.frstRegisterNm}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">등록된 할일이 없습니다.</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
