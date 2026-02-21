'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ServerResource } from '@/components/admin/system/monitoring/ServerResource';
import { HttpMonitor } from '@/components/admin/system/monitoring/HttpMonitor';
import { DbMonitor } from '@/components/admin/system/monitoring/DbMonitor';
import { FileSystemMonitor } from '@/components/admin/system/monitoring/FileSystemMonitor';
import { ProcessMonitor } from '@/components/admin/system/monitoring/ProcessMonitor';
import { NetworkServiceMonitor } from '@/components/admin/system/monitoring/NetworkServiceMonitor';
import { Activity, Globe, Database, HardDrive, Cpu, Network } from 'lucide-react';

export default function MonitoringPage() {
  const [activeTab, setActiveTab] = useState('server');

  return (
    <div className="space-y-6 pb-12">
      <PageHeader 
        title="통합 시스템 모니터링" 
        breadcrumbs={[{ label: '시스템관리' }, { label: '시스템모니터링' }]}
      />

      <Tabs defaultValue="server" onValueChange={setActiveTab} className="space-y-6">
        <div className="bg-card border rounded-2xl p-1 shadow-sm overflow-x-auto">
          <TabsList className="h-14 w-full justify-start gap-2 bg-transparent p-0">
            <TabsTrigger value="server" className="h-12 rounded-xl px-6 data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-bold gap-2">
              <Activity size={18} /> 서버 리소스
            </TabsTrigger>
            <TabsTrigger value="http" className="h-12 rounded-xl px-6 data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-bold gap-2">
              <Globe size={18} /> HTTP 서비스
            </TabsTrigger>
            <TabsTrigger value="db" className="h-12 rounded-xl px-6 data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-bold gap-2">
              <Database size={18} /> 데이터베이스
            </TabsTrigger>
            <TabsTrigger value="filesys" className="h-12 rounded-xl px-6 data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-bold gap-2">
              <HardDrive size={18} /> 파일시스템
            </TabsTrigger>
            <TabsTrigger value="process" className="h-12 rounded-xl px-6 data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-bold gap-2">
              <Cpu size={18} /> 프로세스
            </TabsTrigger>
            <TabsTrigger value="network" className="h-12 rounded-xl px-6 data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-bold gap-2">
              <Network size={18} /> 네트워크 서비스
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="bg-card border rounded-3xl shadow-sm p-6 min-h-[500px]">
          <TabsContent value="server" className="mt-0">
            <div className="mb-4">
              <h3 className="text-lg font-black text-foreground">서버 리소스 로그</h3>
              <p className="text-sm text-muted-foreground">CPU, Memory 등 서버의 주요 자원 사용률 이력을 조회합니다.</p>
            </div>
            <ServerResource />
          </TabsContent>
          
          <TabsContent value="http" className="mt-0">
            <div className="mb-4">
              <h3 className="text-lg font-black text-foreground">HTTP 웹 서비스 모니터링</h3>
              <p className="text-sm text-muted-foreground">주요 웹 사이트 및 URL의 응답 상태(200 OK 등)를 주기적으로 확인합니다.</p>
            </div>
            <HttpMonitor />
          </TabsContent>

          <TabsContent value="db" className="mt-0">
            <div className="mb-4">
              <h3 className="text-lg font-black text-foreground">데이터베이스(DBMS) 모니터링</h3>
              <p className="text-sm text-muted-foreground">연동된 데이터베이스 서버의 연결 상태 및 가용성을 모니터링합니다.</p>
            </div>
            <DbMonitor />
          </TabsContent>

          <TabsContent value="filesys" className="mt-0">
            <div className="mb-4">
              <h3 className="text-lg font-black text-foreground">파일시스템(Disk) 모니터링</h3>
              <p className="text-sm text-muted-foreground">서버 디스크의 전체 용량 대비 사용량을 모니터링하고 임계치를 관리합니다.</p>
            </div>
            <FileSystemMonitor />
          </TabsContent>

          <TabsContent value="process" className="mt-0">
            <div className="mb-4">
              <h3 className="text-lg font-black text-foreground">프로세스 모니터링</h3>
              <p className="text-sm text-muted-foreground">서버 내 핵심 프로세스의 실행 상태(Running/Stopped)를 점검합니다.</p>
            </div>
            <ProcessMonitor />
          </TabsContent>

          <TabsContent value="network" className="mt-0">
            <div className="mb-4">
              <h3 className="text-lg font-black text-foreground">네트워크 서비스(Port) 모니터링</h3>
              <p className="text-sm text-muted-foreground">특정 IP와 Port에 대한 네트워크 연결 가능 여부를 확인합니다.</p>
            </div>
            <NetworkServiceMonitor />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
