'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell,
  CalendarCheck,
  CheckSquare,
  FileText,
  Vote
} from "lucide-react";
import { getPollList } from '@/services/poll/pollService';
import { OnlinePollManageVO } from '@/types/poll';
import client from '@/lib/api/client';

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
      // Parallelize fetching of Dashboard Data and Active Polls to improve performance
      // We catch errors individually so one failure doesn't block the other
      const dashboardPromise = client.get('/dashboard')
        .catch((e) => {
          console.error("Dashboard fetch error", e);
          return null;
        });

      const pollPromise = getPollList({ pageIndex: 1 })
        .catch((e) => {
          console.error("Poll fetch error", e);
          return null;
        });

      // Await both promises simultaneously
      const [dashboardRes, pollRes] = await Promise.all([dashboardPromise, pollPromise]);

      // 1. Process Dashboard Data
      if (dashboardRes && dashboardRes.data && dashboardRes.data.success) {
        setTaskList(dashboardRes.data.taskList || []);
        setNotiList(dashboardRes.data.notiList || []);
      }

      // 2. Process Active Polls
      if (pollRes && pollRes.resultList) {
        const today = new Date().toISOString().slice(0, 10);
        const active = pollRes.resultList.find(p =>
          p.pollBeginDe <= today && p.pollEndDe >= today
        );
        setActivePoll(active || null);
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
          <div className="absolute top-0 right-0 p-4 opacity-10" aria-hidden="true">
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
            <Link
              href="/cop/bbs/selectBoardList?bbsId=BBSMSTR_AAAAAAAAAAAA"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
              aria-label="공지사항 더보기"
            >
              더보기
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
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
            <Link
              href="/cop/bbs/selectBoardList?bbsId=BBSMSTR_CCCCCCCCCCCC"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
              aria-label="오늘의 할일 더보기"
            >
              더보기
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
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
