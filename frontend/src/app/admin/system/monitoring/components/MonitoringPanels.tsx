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
      "inline-flex items-center gap-1.5 rounded border border-warning/40 bg-warning/15 px-2 py-0.5 text-xs text-foreground",
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
      /*
       * 패널 DOM 은 활성 탭 하나뿐이므로 aria-controls 대상 id 도 하나로 고정한다.
       * 종전에는 탭마다 `monitoring-panel-${tab}` 을 가리켜 비활성 6개가 **존재하지 않는 id** 를
       * 참조했다(스크린리더가 따라갈 대상이 없는 참조).
       */
      aria-controls="monitoring-panel"
      onClick={onClick}
      className={cn(
        'flex h-[var(--control-h-sm)] items-center gap-2 rounded px-3 text-[length:var(--font-size-body)] font-medium transition-colors',
        active ? 'bg-muted text-primary' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <span aria-hidden="true" className="shrink-0">{icon}</span>
      <span className="text-left leading-tight">{label}</span>
    </button>
  );
}

export function StatusIndicator({ label, status, icon: Icon }: { label: string, status: string, icon: any }) {
  // 상태 표시등 분기 — 시스템 상태 표시등(healthData.status === 'UP')과 같은 규약.
  // 정상('UP'/'안정')만 초록, 미상('UNKNOWN'/빈값)은 주황, 그 외(DOWN/OUT_OF_SERVICE 등)는 적색으로 장애를 드러낸다.
  const isUp = status === 'UP' || status === '안정';
  const isUnknown = !isUp && (!status || status === 'UNKNOWN');

  return (
    <div className="space-y-2 rounded-md border border-surface-inverse-border bg-surface-inverse-foreground/5 p-3 transition-colors hover:bg-surface-inverse-foreground/10">
      <div className="flex items-center justify-between">
          <p className="text-xs text-surface-inverse-foreground/70">{label}</p>
          <Icon size={14} className="text-surface-inverse-foreground/70" aria-hidden="true" />
      </div>
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "size-2.5 shrink-0 rounded-full",
            isUp ? "bg-success" : isUnknown ? "bg-warning" : "bg-destructive"
          )}
        />
        {/* 상태는 색이 아니라 이 문자열이 말한다 — 점은 보조 신호다(WCAG 1.4.1). */}
        <span className="text-lg font-semibold text-surface-inverse-foreground">
          {status}
        </span>
      </div>
    </div>
  );
}

// 선택 상태를 쓰지 않는 개요 패널 — 과거 미사용 props(selectedItemId/setSelectedItemId)를 받고 있었다(死코드).
export function HarnessDashboardOverview() {
  return (
    <div className="flex h-full flex-col space-y-4 overflow-hidden rounded-md border border-border bg-card p-4 text-left font-sans">
      <div className="border-b border-border pb-3">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <h3 className="text-xs text-muted-foreground">Harness Governance SSOT</h3>
          <SampleDataBadge />
        </div>
        <h2 className="mb-1 text-lg font-semibold tracking-tight text-foreground">아틀라스 통합 관제</h2>
        {/* '실시간 지표'라는 표현은 사실이 아니다 — 아래는 저장소 규범 문서를 요약한 정적 안내다. */}
        <p className="text-xs text-muted-foreground">AI 오케스트레이션 & 3대 기술 헌법 규범 요약(정적 문서 기반)</p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {/*
          [P1-5] 'ORCHESTRATION SCORE 99.8%' · 'TIER 1 SECURE' 등 산출 근거가 전무한 점수 카드 삭제.
          측정 파이프라인이 생기기 전까지 숫자를 만들어 보여주지 않는다.
        */}

        {/* 3대 기술 헌법 수호 패널 — 조문 수는 각 constitution.md 원문 기준 */}
        <div className="space-y-4">
          <h4 className="text-[length:var(--font-size-body)] font-semibold text-foreground">3대 기술 헌법 개요</h4>
          <div className="space-y-3">
            <div className="flex flex-col gap-0.5 rounded-md border border-border bg-muted px-3 py-2">
              <span className="text-[10px] font-medium tracking-wide text-muted-foreground">DATABASE</span>
              <h5 className="text-xs font-bold text-foreground">DB 표준화 헌법 (10조)</h5>
              <p className="text-[10px] text-muted-foreground leading-tight">물리 테이블 tb_ 접두사, CHAR(1) 플래그, 메타 데이터 명세 보증</p>
            </div>
            <div className="flex flex-col gap-0.5 rounded-md border border-border bg-muted px-3 py-2">
              <span className="text-[10px] font-medium tracking-wide text-muted-foreground">BACKEND</span>
              <h5 className="text-xs font-bold text-foreground">백엔드 API 헌법 (18조)</h5>
              <p className="text-[10px] text-muted-foreground leading-tight">엔티티 노출 금지, UnifiedResponse 보증, JWT 2차 보안 아키텍처</p>
            </div>
            <div className="flex flex-col gap-0.5 rounded-md border border-border bg-muted px-3 py-2">
              <span className="text-[10px] font-medium tracking-wide text-muted-foreground">FRONTEND</span>
              {/* 조문 수 오기 정정: 15조 → 17조 */}
              <h5 className="text-xs font-bold text-foreground">프론트엔드 UX 헌법 (17조)</h5>
              <p className="text-[10px] text-muted-foreground leading-tight">Server Component 우선, HSL 디자인 토큰, 반응형·접근성 준수</p>
            </div>
          </div>
        </div>

        {/* Ralph Loop 2.0 Trace 패널 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-[length:var(--font-size-body)] font-semibold text-foreground">Ralph Loop 2.0 절차</h4>
          </div>
          <div className="space-y-3 rounded-md border border-border bg-muted p-3">
            <div className="relative space-y-3 border-l-2 border-border py-1 pl-5">
              <div className="relative">
                <div className="absolute -left-[27px] top-0.5 size-3.5 rounded-full border-4 border-card bg-surface-inverse" aria-hidden="true" />
                <span className="text-[10px] font-medium tracking-wide text-muted-foreground">STEP 1. Stop & Diagnose</span>
                <p className="text-[10px] text-muted-foreground font-medium leading-tight mt-0.5">에러 시 즉각 중단 및 오판 진단(False Assumption) 도출</p>
              </div>
              <div className="relative">
                <div className="absolute -left-[27px] top-0.5 size-3.5 rounded-full border-4 border-card bg-primary" aria-hidden="true" />
                <span className="text-[10px] font-medium tracking-wide text-primary">STEP 2. Evidence Probe</span>
                <p className="text-[10px] text-muted-foreground font-medium leading-tight mt-0.5">E2E DOM 상태, DB Bridge를 통한 물리 근본 원인 획득</p>
              </div>
              <div className="relative">
                <div className="absolute -left-[27px] top-0.5 size-3.5 rounded-full border-4 border-card bg-success" aria-hidden="true" />
                <span className="text-[10px] font-medium tracking-wide text-muted-foreground">STEP 3. Reflection & Healing</span>
                <p className="text-[10px] text-muted-foreground font-medium leading-tight mt-0.5">성찰 리포트 발행 및 콤팩트 픽스 및 무결성 재통과</p>
              </div>
            </div>
          </div>
        </div>

        {/* Guides */}
        <div className="space-y-1.5 rounded-md border border-border bg-muted p-3 text-[10px] leading-relaxed text-muted-foreground">
          <h5 className="font-bold text-foreground flex items-center gap-1.5"><Cpu size={12} className="text-primary" aria-hidden="true" /> 아틀라스 사용법</h5>
          <p className="text-muted-foreground font-medium leading-relaxed">
            좌측 <strong>에이전트 하네스 아틀라스</strong> 목록에서 스킬 엔진 카드나 항목을 클릭하십시오.
          </p>
          <p className="text-muted-foreground font-medium leading-relaxed">
            선택 시 저장소 규범 문서를 요약한 상세 설명과 대표 호출 스택 예시가 표시됩니다. 실행 중인 시스템을 계측한 값이 아닙니다.
          </p>
        </div>
      </div>

    </div>
  );
}

export function SkillDetailView({ skill }: { skill: any }) {
  const meta: Record<string, { impact: "HIGH" | "MEDIUM", constitution: string, constDesc: string, flow: string[] }> = {
    "SKILL_ENG_01": {
      impact: "HIGH",
      constitution: "DB 헌법 제1조, BE 헌법 제11조",
      constDesc: "물리 테이블 명명 SSOT 및 다중 모듈 간 완벽 격리 아키텍처 검증 보증",
      flow: ["PostgreSQL 물리 스키마 로드", "Gradle 모듈 구조 위상 맵 빌드", "1M+ 토큰 가상 메모리 적재", "상호 참조 락 교차 검증"]
    },
    "SKILL_ENG_02": {
      impact: "HIGH",
      constitution: "BE 헌법 제3조, FE 헌법 제7조",
      constDesc: "DB 제약조건 ➔ BE DTO ➔ FE Zod 스키마의 단방향 연쇄 거울 동기화 강제",
      flow: ["DB 제약 조건 스캔", "BE DTO OpenAPI 스펙 대조", "FE generated-api TS 타입 추출", "Zod 스키마 런타임 검사"]
    },
    "SKILL_ENG_03": {
      impact: "HIGH",
      constitution: "BE 헌법 제14조, 글로벌 헌법 제5조",
      constDesc: "Spring Security 필터 체인, JWT 권한 토큰, Next.js 미들웨어의 레드팀 침투 자동 감사",
      flow: ["Security Filter Chain 가로채기", "JWT 클레임 위변조 인젝션", "Next.js Middleware 권한 우회", "OWASP 취약점 체크리스트 검증"]
    },
    "SKILL_ENG_04": {
      impact: "HIGH",
      constitution: "글로벌 헌법 제4조, BE 헌법 제9조",
      constDesc: "DB Bridge 접속 상태, JVM 포트 충돌, E2E 좀비 프로세스의 실시간 자가 치유",
      flow: ["OCI DB Bridge Heartbeat 핑", "포트 5432 / 8080 커넥션 모니터링", "프로세스 락 감지 시 즉각 SIGKILL", "포트 바인딩 락 해제 및 서버 재가동"]
    },
    "SKILL_ENG_05": {
      impact: "HIGH",
      constitution: "DB 헌법 제8조, BE 헌법 제6조",
      constDesc: "데이터베이스 스키마 변경 시 무중단 Expand-and-Contract 계획서 자동 수립",
      flow: ["신규 컬럼/테이블 확장 (Expand)", "이중 쓰기 (Dual Write) 동기화", "구 컬럼 참조 프론트엔드 변경 완료", "레거시 컬럼 최종 수축 (Contract)"]
    },
    "SKILL_ENG_06": {
      impact: "MEDIUM",
      constitution: "BE 헌법 제16조 (뮤테이션 85%)",
      constDesc: "비즈니스 소스 코드에 인위적 뮤턴트(미세 버그)를 주입해 단위 테스트 방어력 실증",
      flow: ["소스 코드 AST(구조 분석 트리) 파싱", "인위적인 연산자 반전/널 변환 주입", "해당 영향 범위 단위 테스트 실행", "뮤턴트 킬(Kill) 여부 계측 및 스코어 연산"]
    },
    "SKILL_ENG_07": {
      impact: "HIGH",
      constitution: "FE 헌법 제1조, 제12조",
      constDesc: "Playwright 브라우저를 통한 픽셀 비교 및 HSL/글래스모피즘 에스테틱 준수 검사",
      flow: ["FHD/HD 듀얼 뷰포트 인스턴스 가동", "HSL 다크 슬레이트 명도 대비 비교", "CSS Framer Motion 가속 체크", "비주얼 회귀 및 UI 찌그러짐 감지"]
    },
    "SKILL_ENG_08": {
      impact: "MEDIUM",
      constitution: "글로벌 헌법 제7조, BE 헌법 제18조",
      constDesc: "API/DB 변경 사항을 감지하여 Markdown 기술 문서 및 Mermaid 다이어그램 동적 갱신",
      flow: ["소스/스키마 변경 파일 AST 감시", "Mermaid 마크다운 템플릿 로드", "다이어그램 관계선 신규 매핑", "Git 가이드북 마크다운 파일 자동 기록"]
    }
  };

  const currentMeta = meta[skill.id] || {
    impact: "MEDIUM" as const,
    constitution: "해당 없음",
    constDesc: "지정된 헌법 규정이 존재하지 않습니다.",
    flow: ["정의된 프로세스 단계가 없습니다."]
  };

  return (
    <div className="space-y-4 text-left font-sans animate-in fade-in duration-500">
      {/* Target Skill Header */}
      <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted p-3">
        <div>
          <span className="font-mono text-[10px] text-muted-foreground">{skill.id}</span>
          <h4 className="mt-0.5 text-base font-semibold text-foreground">{skill.name}</h4>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded border border-success/40 bg-success/15 px-2 py-0.5 text-xs text-foreground">
          <div className="size-1.5 rounded-full bg-success" aria-hidden="true" />
          {skill.status}
        </div>
      </div>

      {/* Basic Metrics */}
      {/*
        [2026-08-29] 'PERFORMANCE METRICS' 셀 제거.

        그 값(메모리 점유 1.2GB · 스캔 속도 240ms · 보안 점수 99.8/100 …)은 계측 결과가
        아니라 이 파일 :181~ 의 meta 객체에 **문자열로 박혀 있던 상수**다. 화면은 그것을
        관제 지표처럼 보여 줬다. 계측 원천이 생기면 그때 값과 함께 되살린다.
      */}
      <div className="grid grid-cols-1 gap-2">
        <div className="space-y-1 rounded-md border border-border bg-muted px-3 py-2">
          <span className="block text-xs text-muted-foreground">시스템 영향도</span>
          <span className={cn("text-[length:var(--font-size-body)] font-semibold", currentMeta.impact === "HIGH" ? "text-destructive-emphasis" : "text-foreground")}>
            {currentMeta.impact === "HIGH" ? '높음' : '보통'}
          </span>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-2">
            <div className={cn("h-full", currentMeta.impact === "HIGH" ? "w-full bg-destructive" : "w-2/3 bg-warning")} aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* Constitution Mapping */}
      <div className="space-y-2 rounded-md border border-border bg-muted p-3">
        <div className="flex items-center gap-2 text-primary font-bold text-xs">
          <ShieldCheck size={14} />
          <span>연관 기술 헌법: {currentMeta.constitution}</span>
        </div>
        <p className="text-xs leading-normal text-muted-foreground">
          {currentMeta.constDesc}
        </p>
      </div>

      {/* Flow Steps */}
      <div className="space-y-3">
        <h5 className="text-[length:var(--font-size-body)] font-semibold text-foreground">오케스트레이션 파이프라인 (Execution Flow)</h5>
        <div className="relative pl-6 border-l-2 border-border space-y-4 py-2">
          {currentMeta.flow.map((step, idx) => (
            <div key={idx} className="relative">
              <div className="absolute -left-[30px] top-0.5 flex size-3.5 items-center justify-center rounded-full border-4 border-card bg-surface-inverse font-mono text-[7px] text-surface-inverse-foreground">
                {idx + 1}
              </div>
              <p className="text-xs leading-tight text-foreground">{step}</p>
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
    <div className="space-y-4 text-left font-sans animate-in fade-in duration-500">
      {/* Test Log Header */}
      <div className="rounded-md border border-border bg-muted p-3">
        <span className="font-mono text-[10px] text-muted-foreground">{test.id}</span>
        <h4 className="mt-0.5 break-all text-[length:var(--font-size-body)] font-semibold leading-snug text-foreground">{test.testName}</h4>
        <p className="mt-1 text-xs text-muted-foreground">표본 시각: {test.time}</p>
      </div>

      {/* SQL Budget Slider */}
      <div className="space-y-2 rounded-md border border-border bg-muted p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">JPA SQL CALLS BUDGET</span>
          <span className="font-mono text-xs text-foreground">{test.queries} / {test.max} SQL</span>
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded bg-border">
          <div
            className="h-full bg-success"
            style={{ width: `${fillPercentage}%` }}
            aria-hidden="true"
          />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>SAFE LIMIT: {test.max}</span>
          <span className="text-foreground">{Math.round(100 - fillPercentage)}% UNDER BUDGET</span>
        </div>
      </div>

      {/* Telemetry Summary */}
      <div className="space-y-1.5 rounded-md border border-success/30 bg-success/10 p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <CheckCircle2 size={14} className="text-success-emphasis" aria-hidden="true" />
          <span>표본 판정: {test.status}</span>
        </div>
        <p className="text-xs leading-normal text-foreground">
          {currentStack.summary}
        </p>
      </div>

      {/* SQL Stacks */}
      <div className="space-y-4">
        <h5 className="text-[length:var(--font-size-body)] font-semibold text-foreground">대표 DB 호출 스택 예시 (Database Call Stack)</h5>
        <div className="space-y-3">
          {currentStack.stacks.map((stack, idx) => (
            <div key={idx} className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">
                  {stack.type}
                </span>
                <span className="rounded bg-muted px-2 py-0.5 font-mono text-[10px] text-foreground">
                  {stack.table}
                </span>
              </div>
              <pre className="whitespace-pre-wrap break-all font-mono text-xs leading-normal text-foreground">
                {stack.sql}
              </pre>
            </div>
          ))}
          {currentStack.stacks.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">수집된 데이터베이스 질의 로그가 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}
