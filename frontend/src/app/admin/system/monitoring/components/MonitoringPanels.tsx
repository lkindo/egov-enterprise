'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Cpu, ShieldCheck } from 'lucide-react';

/**
 * 모니터링 허브의 표시 전용 패널 모음.
 *
 * <p>2026-08-05 에 {@code MonitoringHubClient.tsx}(1,387줄)에서 <b>로직 변경 없이 이동</b>했다.
 * 원래 이 컴포넌트들은 허브 본체와 같은 파일의 최상위에 선언돼 있었고, 본체의 상태·쿼리를
 * 전혀 참조하지 않는 순수 표시 컴포넌트다 — 파일을 나눌 때 경계가 이미 거기 있었다.
 *
 * <p>타입 {@code MonitoringTab} 은 본체가 소유하므로 여기서 재선언하지 않고 import 한다.
 */
import type { MonitoringTab } from '../MonitoringHubClient';

export function SampleDataBadge({ className }: { className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-[10px] font-black tracking-widest uppercase dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/40",
      className
    )}>
      <AlertCircle size={11} aria-hidden="true" /> 샘플 데이터 · 실측 미연동
    </span>
  );
}


export function NavButton({ tab, icon, label, active, onClick }: { tab: MonitoringTab, icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      id={`monitoring-tab-${tab}`}
      aria-selected={active}
      aria-controls={`monitoring-panel-${tab}`}
      onClick={onClick}
      className={cn(
        "w-full group p-5 rounded-lg border-2 transition-all flex items-center gap-6",
        active
          ? "bg-surface-inverse border-surface-inverse-border text-surface-inverse-foreground shadow-2xl scale-[1.02] z-10"
          : "bg-transparent border-transparent hover:bg-card hover:border-border text-muted-foreground hover:text-foreground"
      )}
    >
      <div aria-hidden="true" className={cn(
        "w-12 h-12 rounded-lg flex items-center justify-center transition-all shadow-lg",
        active ? "bg-white/10 text-surface-inverse-foreground" : "bg-card text-muted-foreground group-hover:bg-primary group-hover:text-white"
      )}>
        {icon}
      </div>
      <span className="text-xs font-bold tracking-tight text-left leading-tight">{label}</span>
    </button>
  );
}

export function StatusIndicator({ label, status, icon: Icon }: { label: string, status: string, icon: any }) {
  // 상태 표시등 분기 — 코어 엔진 인디케이터(healthData.status === 'UP')와 동일 규약.
  // 정상('UP'/'안정')만 초록, 미상('UNKNOWN'/빈값)은 주황, 그 외(DOWN/OUT_OF_SERVICE 등)는 적색으로 장애를 드러낸다.
  const isUp = status === 'UP' || status === '안정';
  const isUnknown = !isUp && (!status || status === 'UNKNOWN');

  return (
    <div className="p-8 rounded-lg bg-white/5 border border-white/5 space-y-6 group hover:bg-white/10 transition-colors">
      <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-white/20 tracking-tight">{label}</p>
          <Icon size={16} className="text-white/20 group-hover:text-primary transition-colors" />
      </div>
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "w-2.5 h-2.5 rounded-full animate-pulse",
            isUp
              ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,1)]"
              : isUnknown
                ? "bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,1)]"
                : "bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,1)]"
          )}
        />
        <span className={cn(
          "text-2xl font-bold tracking-tighter",
          isUp ? "text-surface-inverse-foreground" : isUnknown ? "text-amber-300" : "text-rose-300"
        )}>
          {status}
        </span>
      </div>
    </div>
  );
}

// 선택 상태를 쓰지 않는 개요 패널 — 과거 미사용 props(selectedItemId/setSelectedItemId)를 받고 있었다(死코드).
export function HarnessDashboardOverview() {
  return (
    <div className="rounded-lg bg-card border-2 border-border shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] h-full p-10 space-y-10 flex flex-col relative overflow-hidden text-left font-sans">
      <div className="border-b border-border pb-6 relative z-10">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <h3 className="text-xs font-bold text-muted-foreground tracking-tight">Harness Governance SSOT</h3>
          <SampleDataBadge />
        </div>
        <h2 className="text-3xl font-black text-foreground tracking-tighter leading-none mb-3">아틀라스 통합 관제</h2>
        {/* '실시간 지표'라는 표현은 사실이 아니다 — 아래는 저장소 규범 문서를 요약한 정적 안내다. */}
        <p className="text-xs font-bold text-muted-foreground tracking-tight">AI 오케스트레이션 & 3대 기술 헌법 규범 요약(정적 문서 기반)</p>
      </div>

      <div className="flex-1 space-y-8 overflow-y-auto pr-2 custom-scrollbar relative z-10">
        {/*
          [P1-5] 'ORCHESTRATION SCORE 99.8%' · 'TIER 1 SECURE' 등 산출 근거가 전무한 점수 카드 삭제.
          측정 파이프라인이 생기기 전까지 숫자를 만들어 보여주지 않는다.
        */}

        {/* 3대 기술 헌법 수호 패널 — 조문 수는 각 constitution.md 원문 기준 */}
        <div className="space-y-4">
          <h4 className="text-xs font-black text-foreground uppercase tracking-widest leading-none">3대 기술 헌법 개요</h4>
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-muted border border-border flex flex-col gap-1 relative overflow-hidden">
              <span className="text-[9px] font-black uppercase tracking-wider text-rose-500">DATABASE</span>
              <h5 className="text-xs font-bold text-foreground">DB 표준화 헌법 (10조)</h5>
              <p className="text-[10px] text-muted-foreground leading-tight">물리 테이블 tb_ 접두사, CHAR(1) 플래그, 메타 데이터 명세 보증</p>
            </div>
            <div className="p-4 rounded-lg bg-muted border border-border flex flex-col gap-1 relative overflow-hidden">
              <span className="text-[9px] font-black uppercase tracking-wider text-primary">BACKEND</span>
              <h5 className="text-xs font-bold text-foreground">백엔드 API 헌법 (18조)</h5>
              <p className="text-[10px] text-muted-foreground leading-tight">엔티티 노출 금지, UnifiedResponse 보증, JWT 2차 보안 아키텍처</p>
            </div>
            <div className="p-4 rounded-lg bg-muted border border-border flex flex-col gap-1 relative overflow-hidden">
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600">FRONTEND</span>
              {/* 조문 수 오기 정정: 15조 → 17조 */}
              <h5 className="text-xs font-bold text-foreground">프론트엔드 UX 헌법 (17조)</h5>
              <p className="text-[10px] text-muted-foreground leading-tight">Server Component 우선, HSL 디자인 토큰, 반응형·접근성 준수</p>
            </div>
          </div>
        </div>

        {/* Ralph Loop 2.0 Trace 패널 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-foreground uppercase tracking-widest leading-none">Ralph Loop 2.0 절차</h4>
          </div>
          <div className="p-6 rounded-lg bg-muted border border-border space-y-4">
            <div className="relative pl-5 border-l-2 border-border space-y-4 py-1">
              <div className="relative">
                <div className="absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full border-4 border-card bg-surface-inverse shadow-sm" />
                <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">STEP 1. Stop & Diagnose</span>
                <p className="text-[10px] text-muted-foreground font-medium leading-tight mt-0.5">에러 시 즉각 중단 및 오판 진단(False Assumption) 도출</p>
              </div>
              <div className="relative">
                <div className="absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full border-4 border-card bg-primary shadow-sm animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-wider text-primary">STEP 2. Evidence Probe</span>
                <p className="text-[10px] text-muted-foreground font-medium leading-tight mt-0.5">E2E DOM 상태, DB Bridge를 통한 물리 근본 원인 획득</p>
              </div>
              <div className="relative">
                <div className="absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full border-4 border-card bg-emerald-500 shadow-sm" />
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600">STEP 3. Reflection & Healing</span>
                <p className="text-[10px] text-muted-foreground font-medium leading-tight mt-0.5">성찰 리포트 발행 및 콤팩트 픽스 및 무결성 재통과</p>
              </div>
            </div>
          </div>
        </div>

        {/* Guides */}
        <div className="p-5 bg-hub-indigo/5 border border-hub-indigo/10 rounded-lg text-muted-foreground text-[10px] leading-relaxed space-y-2">
          <h5 className="font-bold text-foreground flex items-center gap-1.5"><Cpu size={12} className="text-primary animate-pulse" /> 지능형 아틀라스 사용법</h5>
          <p className="text-muted-foreground font-medium leading-relaxed">
            좌측 <strong>에이전트 하네스 아틀라스</strong> 스트림에서 8대 스킬 엔진 카드나 실시간 JPA 쿼리 성능 계측 로그 항목을 클릭하십시오.
          </p>
          <p className="text-muted-foreground font-medium leading-relaxed">
            선택 시 즉각 상세 아키텍처 정보와 데이터베이스 호출 스택 및 토폴로지가 시각화됩니다.
          </p>
        </div>
      </div>

      <div className="absolute left-0 top-0 w-full h-2 bg-emerald-500/20" />
    </div>
  );
}

export function SkillDetailView({ skill }: { skill: any }) {
  const meta: Record<string, { impact: "HIGH" | "MEDIUM", constitution: string, constDesc: string, metrics: string, flow: string[] }> = {
    "SKILL_ENG_01": {
      impact: "HIGH",
      constitution: "DB 헌법 제1조, BE 헌법 제11조",
      constDesc: "물리 테이블 명명 SSOT 및 다중 모듈 간 완벽 격리 아키텍처 검증 보증",
      metrics: "메모리 점유 1.2GB | 스캔 속도 240ms | 정밀도 100%",
      flow: ["PostgreSQL 물리 스키마 로드", "Gradle 모듈 구조 위상 맵 빌드", "1M+ 토큰 가상 메모리 적재", "상호 참조 락 교차 검증"]
    },
    "SKILL_ENG_02": {
      impact: "HIGH",
      constitution: "BE 헌법 제3조, FE 헌법 제7조",
      constDesc: "DB 제약조건 ➔ BE DTO ➔ FE Zod 스키마의 단방향 연쇄 거울 동기화 강제",
      metrics: "계약 검증률 100% | 충돌 방어 0건 | 연쇄 지연 12ms",
      flow: ["DB 제약 조건 스캔", "BE DTO OpenAPI 스펙 대조", "FE generated-api TS 타입 추출", "Zod 스키마 런타임 검사"]
    },
    "SKILL_ENG_03": {
      impact: "HIGH",
      constitution: "BE 헌법 제14조, 글로벌 헌법 제5조",
      constDesc: "Spring Security 필터 체인, JWT 권한 토큰, Next.js 미들웨어의 레드팀 침투 자동 감사",
      metrics: "보안 점수 99.8/100 | 위협 감지 0건 | 무결성 ACTIVE",
      flow: ["Security Filter Chain 가로채기", "JWT 클레임 위변조 인젝션", "Next.js Middleware 권한 우회", "OWASP 취약점 체크리스트 검증"]
    },
    "SKILL_ENG_04": {
      impact: "HIGH",
      constitution: "글로벌 헌법 제4조, BE 헌법 제9조",
      constDesc: "DB Bridge 접속 상태, JVM 포트 충돌, E2E 좀비 프로세스의 실시간 자가 치유",
      metrics: "자가치유율 100% | 평균 복구 1.8초 | 좀비 포트 차단 4건",
      flow: ["OCI DB Bridge Heartbeat 핑", "포트 5432 / 8080 커넥션 모니터링", "프로세스 락 감지 시 즉각 SIGKILL", "포트 바인딩 락 해제 및 서버 재가동"]
    },
    "SKILL_ENG_05": {
      impact: "HIGH",
      constitution: "DB 헌법 제8조, BE 헌법 제6조",
      constDesc: "데이터베이스 스키마 변경 시 무중단 Expand-and-Contract 계획서 자동 수립",
      metrics: "배포 가동률 100% | 다운타임 0.00ms | 2단계 롤아웃 계획",
      flow: ["신규 컬럼/테이블 확장 (Expand)", "이중 쓰기 (Dual Write) 동기화", "구 컬럼 참조 프론트엔드 변경 완료", "레거시 컬럼 최종 수축 (Contract)"]
    },
    "SKILL_ENG_06": {
      impact: "MEDIUM",
      constitution: "BE 헌법 제16조 (뮤테이션 85%)",
      constDesc: "비즈니스 소스 코드에 인위적 뮤턴트(미세 버그)를 주입해 단위 테스트 방어력 실증",
      metrics: "뮤테이션 스코어 88.5% | 생존 뮤턴트 2개 | 검증 속도 4.2s",
      flow: ["소스 코드 AST(구조 분석 트리) 파싱", "인위적인 연산자 반전/널 변환 주입", "해당 영향 범위 단위 테스트 실행", "뮤턴트 킬(Kill) 여부 계측 및 스코어 연산"]
    },
    "SKILL_ENG_07": {
      impact: "HIGH",
      constitution: "FE 헌법 제1조, 제12조",
      constDesc: "Playwright 브라우저를 통한 픽셀 비교 및 HSL/글래스모피즘 에스테틱 준수 검사",
      metrics: "픽셀 일치율 99.94% | 60FPS 모션 합격 | 반응형 HD 통과",
      flow: ["FHD/HD 듀얼 뷰포트 인스턴스 가동", "HSL 다크 슬레이트 명도 대비 비교", "CSS Framer Motion 가속 체크", "비주얼 회귀 및 UI 찌그러짐 감지"]
    },
    "SKILL_ENG_08": {
      impact: "MEDIUM",
      constitution: "글로벌 헌법 제7조, BE 헌법 제18조",
      constDesc: "API/DB 변경 사항을 감지하여 Markdown 기술 문서 및 Mermaid 다이어그램 동적 갱신",
      metrics: "문서 불일치율 0% | 다이어그램 일치 100% | 지연 1.1s",
      flow: ["소스/스키마 변경 파일 AST 감시", "Mermaid 마크다운 템플릿 로드", "다이어그램 관계선 신규 매핑", "Git 가이드북 마크다운 파일 자동 기록"]
    }
  };

  const currentMeta = meta[skill.id] || {
    impact: "MEDIUM" as const,
    constitution: "해당 없음",
    constDesc: "지정된 헌법 규정이 존재하지 않습니다.",
    metrics: "정보 없음",
    flow: ["정의된 프로세스 단계가 없습니다."]
  };

  return (
    <div className="space-y-8 text-left font-sans animate-in fade-in duration-500">
      {/* Target Skill Header */}
      <div className="p-6 rounded-lg bg-muted border border-border flex items-center justify-between">
        <div>
          <span className="text-[10px] font-black text-muted-foreground tracking-widest uppercase font-mono">{skill.id}</span>
          <h4 className="text-lg font-black text-foreground tracking-tight mt-1">{skill.name}</h4>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 animate-pulse">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {skill.status}
        </div>
      </div>

      {/* Basic Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-5 rounded-lg bg-muted border border-border space-y-1">
          <span className="text-[9px] font-black text-muted-foreground block uppercase">SYSTEM IMPACT</span>
          <span className={cn("text-xs font-black", currentMeta.impact === "HIGH" ? "text-rose-500" : "text-amber-500")}>
            {currentMeta.impact} SEVERITY
          </span>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-2">
            <div className={cn("h-full", currentMeta.impact === "HIGH" ? "bg-rose-500 w-full" : "bg-amber-500 w-2/3")} />
          </div>
        </div>
        <div className="p-5 rounded-lg bg-muted border border-border space-y-1">
          <span className="text-[9px] font-black text-muted-foreground block uppercase font-sans">PERFORMANCE METRICS</span>
          <span className="text-xs font-bold text-foreground tracking-tight leading-normal block">{currentMeta.metrics.split('|')[0]}</span>
          <span className="text-[9px] text-muted-foreground block leading-none">{currentMeta.metrics.split('|')[1] || ""}</span>
        </div>
      </div>

      {/* Constitution Mapping */}
      <div className="p-6 rounded-lg bg-hub-indigo/5 border border-hub-indigo/10 space-y-3">
        <div className="flex items-center gap-2 text-primary font-bold text-xs">
          <ShieldCheck size={14} />
          <span>연관 기술 헌법: {currentMeta.constitution}</span>
        </div>
        <p className="text-xs font-bold text-hub-indigo leading-normal">
          {currentMeta.constDesc}
        </p>
      </div>

      {/* Flow Steps */}
      <div className="space-y-4">
        <h5 className="text-xs font-black text-foreground uppercase tracking-widest leading-none">오케스트레이션 파이프라인 (Execution Flow)</h5>
        <div className="relative pl-6 border-l-2 border-border space-y-4 py-2">
          {currentMeta.flow.map((step, idx) => (
            <div key={idx} className="relative">
              <div className="absolute -left-[30px] top-0.5 w-3.5 h-3.5 rounded-full border-4 border-card bg-surface-inverse shadow-sm flex items-center justify-center text-[7px] font-black text-surface-inverse-foreground font-mono">
                {idx + 1}
              </div>
              <p className="text-xs font-bold text-foreground leading-tight">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TestDetailView({ test }: { test: any }) {
  const testStacks: Record<string, { summary: string, stacks: { sql: string, table: string, type: "SELECT" | "INSERT" | "DELETE" }[] }> = {
    "TEST_01": {
      summary: "조회 성능 최적화: Batch Fetch 및 Lazy Loading 가동을 통한 성능 확보 합격",
      stacks: [
        { sql: "SELECT * FROM tb_user WHERE ognz_id = 'DEPT_001'", table: "tb_user", type: "SELECT" },
        { sql: "SELECT * FROM tb_ognz WHERE ognz_id = ?", table: "tb_ognz", type: "SELECT" },
        { sql: "SELECT * FROM tb_author WHERE author_code = ?", table: "tb_author", type: "SELECT" }
      ]
    },
    "TEST_02": {
      summary: "권한 거부 예외 처리: 작성자가 아닌 유저의 권한 거부 예외 응답 검증",
      stacks: [
        { sql: "SELECT * FROM tb_schedule WHERE schedule_id = ?", table: "tb_schedule", type: "SELECT" },
        { sql: "SELECT * FROM tb_user WHERE user_id = ?", table: "tb_user", type: "SELECT" }
      ]
    },
    "TEST_03": {
      summary: "대용량 일괄 조회: 부서장 상태 키워드 매핑 및 일정 일괄 조회 성능 통과",
      stacks: [
        { sql: "SELECT * FROM tb_note_info WHERE note_id IN (...)", table: "tb_note_info", type: "SELECT" },
        { sql: "SELECT * FROM tb_schedule WHERE creator_id IN (...)", table: "tb_schedule", type: "SELECT" }
      ]
    },
    "TEST_04": {
      summary: "2차 캐시 조회 효율화: 공통 행정 코드 2차 캐시(Redis) 적재로 DB 부하 Zero화 달성",
      stacks: [
        { sql: "SELECT * FROM tb_instt_code WHERE code = ? (1차 캐싱 미비 시 1회만 조회)", table: "tb_instt_code", type: "SELECT" }
      ]
    }
  };

  const currentStack = testStacks[test.id] || {
    summary: "테스트가 성공적으로 통과되었습니다.",
    stacks: []
  };

  const fillPercentage = (test.queries / test.max) * 100;

  return (
    <div className="space-y-8 text-left font-sans animate-in fade-in duration-500">
      {/* Test Log Header */}
      <div className="p-6 rounded-lg bg-muted border border-border">
        <span className="text-[10px] font-black text-muted-foreground tracking-widest uppercase font-mono">{test.id}</span>
        <h4 className="text-sm font-black text-foreground tracking-tight mt-1 leading-snug break-all">{test.testName}</h4>
        <p className="text-[10px] font-bold text-muted-foreground uppercase mt-2">측정 타임: {test.time}</p>
      </div>

      {/* SQL Budget Slider */}
      <div className="p-6 rounded-lg bg-muted border border-border space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">JPA SQL CALLS BUDGET</span>
          <span className="text-xs font-black text-foreground font-mono">{test.queries} / {test.max} SQL</span>
        </div>
        <div className="w-full h-3 bg-muted rounded-lg overflow-hidden relative">
          <div 
            className="h-full bg-emerald-500 transition-all duration-1000" 
            style={{ width: `${fillPercentage}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground">
          <span>SAFE LIMIT: {test.max}</span>
          <span className="text-emerald-600 font-black">{Math.round(100 - fillPercentage)}% UNDER BUDGET</span>
        </div>
      </div>

      {/* Telemetry Summary */}
      <div className="p-6 rounded-lg bg-emerald-50/50 border border-emerald-100 space-y-2">
        <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
          <CheckCircle2 size={14} className="text-emerald-600 animate-bounce" />
          <span>가드레일 통합 검증 통과: {test.status}</span>
        </div>
        <p className="text-xs font-bold text-foreground leading-normal">
          {currentStack.summary}
        </p>
      </div>

      {/* SQL Stacks */}
      <div className="space-y-4">
        <h5 className="text-xs font-black text-foreground uppercase tracking-widest leading-none">실시간 DB 호출 스택 (Database Call Stack)</h5>
        <div className="space-y-3">
          {currentStack.stacks.map((stack, idx) => (
            <div key={idx} className="p-5 rounded-lg border-2 border-border bg-muted/30 flex flex-col gap-3 relative overflow-hidden group hover:border-primary/20 transition-all">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-black tracking-widest rounded uppercase font-mono">
                  {stack.type}
                </span>
                <span className="px-2 py-0.5 bg-muted text-foreground text-[9px] font-black tracking-widest rounded font-mono uppercase">
                  {stack.table}
                </span>
              </div>
              <pre className="text-xs font-bold font-mono text-foreground whitespace-pre-wrap break-all leading-normal">
                {stack.sql}
              </pre>
            </div>
          ))}
          {currentStack.stacks.length === 0 && (
            <p className="text-xs text-muted-foreground font-medium text-center py-6">수집된 데이터베이스 질의 로그가 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}
