'use client';

import React from 'react';
import { CheckCircle2, Cpu, ShieldCheck, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SampleDataBadge } from './MonitoringPanels';

/**
 * 모니터링 허브의 '하네스 아틀라스' 탭(2026-09-27 DIP B5 F11 — demo pack 소유).
 *
 * 이 탭은 실측이 아니라 저장소의 스킬 목록을 옮긴 정적 카탈로그와 예시 계측 로그다(화면도 '샘플' 배지로 밝힌다).
 * 운영 제품의 모니터링 기능이 아니므로 demo pack 이 소유한다 — core·collaboration 투영에서는 이 파일과 허브의
 * 등록 한 줄(`EXTRA_TAB_VIEWS`)이 함께 빠지고, 허브는 로그·가동 상태 탭만 남는다.
 */

/**
 * 에이전트 하네스 아틀라스의 스킬 카탈로그.
 * ⚠ 실측 계측이 아니라 저장소의 `.agent/skills/` 목록을 옮겨둔 **정적 카탈로그**다.
 * 과거 이 배열이 렌더 함수와 상세 조회에 각각 중복 정의되어 있어 한쪽만 수정되는 사고가 있었다.
 */
export const HARNESS_SKILLS = [
  { id: "SKILL_ENG_01", name: "Deep Context Mapper", desc: "1M+ 대용량 메모리 기반 다중 모듈 및 DB 위상 맵 로드", status: "ACTIVE", type: "SKILL" as const },
  { id: "SKILL_ENG_02", name: "API Contract Guardian", desc: "DB 제약조건 ➔ BE DTO ➔ FE Zod 스키마 연쇄 거울 동기화", status: "ACTIVE", type: "SKILL" as const },
  { id: "SKILL_ENG_03", name: "OWASP Security Auditor", desc: "Spring Security, Next.js 미들웨어, JWT Red Team 검증", status: "ACTIVE", type: "SKILL" as const },
  { id: "SKILL_ENG_04", name: "Resilience Debugger", desc: "DB Bridge 및 로컬 프로세스 좀비 포트 정리 및 자가복구", status: "ACTIVE", type: "SKILL" as const },
  { id: "SKILL_ENG_05", name: "Zero-Downtime Planner", desc: "PostgreSQL 스키마 변경 시 무중단 Expand-and-Contract 설계", status: "ACTIVE", type: "SKILL" as const },
  { id: "SKILL_ENG_06", name: "Mutation Testing Auditor", desc: "의도적 버그 주입으로 단위/통합 테스트 방어력 실증", status: "ACTIVE", type: "SKILL" as const },
  { id: "SKILL_ENG_07", name: "Visual Auditor", desc: "브라우저 subagent 네이티브 픽셀 비교 regression 오디팅", status: "ACTIVE", type: "SKILL" as const },
  { id: "SKILL_ENG_08", name: "Docs-as-Code Sync", desc: "로직 변경에 따른 Markdown 가이드 및 Mermaid 다이어그램 동적 갱신", status: "ACTIVE", type: "SKILL" as const }
];
export type HarnessSkill = (typeof HARNESS_SKILLS)[number];

/**
 * JPA 가드레일 계측 예시 로그.
 * ⚠ 실측 소스가 없는 **샘플 데이터**다. 화면에서도 '샘플' 배지로 명시한다.
 */
export const HARNESS_SAMPLE_TESTS = [
  { id: "TEST_01", testName: "QueryCountGuardrailIntegrationTest.queryCountGuardrail_successWithinLimit", queries: 12, max: 15, status: "SAFE", time: "방금 전", type: "TEST" as const },
  { id: "TEST_02", testName: "ScheduleServiceTest.deleteSchedule_fail_notCreator", queries: 2, max: 10, status: "SAFE", time: "3분 전", type: "TEST" as const },
  { id: "TEST_03", testName: "NoteServiceImplTest.getReceivedNotes", queries: 4, max: 10, status: "SAFE", time: "8분 전", type: "TEST" as const },
  { id: "TEST_04", testName: "InstitutionCodeServiceTest.verifyCodeRetrievalWithCaching", queries: 1, max: 5, status: "SAFE", time: "15분 전", type: "TEST" as const }
];
export type HarnessTest = (typeof HARNESS_SAMPLE_TESTS)[number];

function isSkillItem(item: unknown): item is HarnessSkill {
  return typeof item === 'object' && item !== null && 'type' in item && (item as { type: string }).type === 'SKILL';
}

function isTestItem(item: unknown): item is HarnessTest {
  return typeof item === 'object' && item !== null && 'type' in item && (item as { type: string }).type === 'TEST';
}

/** 선택 식별자로 카탈로그 항목을 찾는다(스킬 `SKILL_`·예시 계측 `TEST_`). */
export function findHarnessItem(id: string): HarnessSkill | HarnessTest | null {
  if (id.startsWith('SKILL_')) return HARNESS_SKILLS.find((skill) => skill.id === id) ?? null;
  if (id.startsWith('TEST_')) return HARNESS_SAMPLE_TESTS.find((test) => test.id === id) ?? null;
  return null;
}

/** 선택 항목이 카탈로그 항목이면 상세 제목과 본문을 돌려준다. */
export function harnessDetail(item: unknown): { title: string; view: React.ReactNode } | null {
  if (isSkillItem(item)) return { title: '스킬 상세', view: <SkillDetailView skill={item} /> };
  if (isTestItem(item)) return { title: '테스트 상세', view: <TestDetailView test={item} /> };
  return null;
}

export function HarnessAtlasTab({ selectedItemId, onSelect }: {
  selectedItemId: string | number | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-4 font-sans text-foreground">
      {/* --- Section 1: 8대 독점 네이티브 엔진 리스트 (2열 배치) --- */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="text-[length:var(--font-size-body)] font-semibold text-foreground">8대 네이티브 오케스트레이션 엔진</h4>
          <SampleDataBadge />
          <div className="h-px bg-muted flex-1" />
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {HARNESS_SKILLS.map((skill, index) => (
            <button
              key={skill.id}
              type="button"
              aria-label={`${skill.name} 엔진 상세 보기`}
              aria-pressed={selectedItemId === skill.id}
              onClick={() => onSelect(skill.id)}
              className={cn(
                "flex flex-col justify-between rounded-md border bg-muted px-3 py-2 text-left outline-none transition-colors",
                selectedItemId === skill.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary"
              )}
            >
              <div className="space-y-2 w-full">
                <div className="flex items-center justify-between w-full">
                  <span className="font-mono text-[10px] text-muted-foreground">ENG_0{index + 1}</span>
                  <div className="flex items-center gap-1 rounded border border-success/40 bg-success/15 px-1.5 py-0.5 text-xs text-foreground">
                    <div className="size-1.5 rounded-full bg-success" aria-hidden="true" />
                    {skill.status}
                  </div>
                </div>
                <h5 className={cn("text-[length:var(--font-size-body)] font-semibold", selectedItemId === skill.id ? "text-primary" : "text-foreground")}>{skill.name}</h5>
                <p className="text-xs leading-tight text-muted-foreground">{skill.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* --- Section 2: JPA 성능 가드레일 계측 패널 (가로 전체 활용) --- */}
      <div className="space-y-3 rounded-md border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Zap size={18} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground leading-none">JPA Performance Guardrail Telemetry</h4>
              {/* '실시간 계측'이라는 표현은 사실이 아니므로 제거 — 아래 목록은 예시 로그다. */}
              <p className="mt-0.5 text-xs text-muted-foreground">테스트-타임 SQL 쿼리 가드레일 예시 보드</p>
            </div>
          </div>
          <SampleDataBadge />
        </div>

        {/* Test list */}
        <div className="max-h-[320px] space-y-1 overflow-y-auto pr-1">
          {HARNESS_SAMPLE_TESTS.map(log => (
            <button
              key={log.id}
              type="button"
              aria-label={`${log.testName} 계측 상세 보기`}
              aria-pressed={selectedItemId === log.id}
              onClick={() => onSelect(log.id)}
              className={cn(
                "flex w-full items-center justify-between rounded-md border px-3 py-2 text-left outline-none transition-colors",
                selectedItemId === log.id
                  ? "border-primary bg-primary/5"
                  : "border-border bg-muted hover:border-primary"
              )}
            >
              <div className="space-y-1 min-w-0 pr-4">
                <h5 className={cn("truncate text-[length:var(--font-size-body)] font-medium leading-snug", selectedItemId === log.id ? "text-primary" : "text-foreground")}>{log.testName}</h5>
                <p className="text-xs text-muted-foreground">측정 시간: {log.time}</p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <div className="text-xs tabular-nums text-foreground">{log.queries} / {log.max} SQL</div>
                  <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden mt-1 relative">
                    <div
                      className="h-full bg-success"
                      style={{ width: `${(log.queries / log.max) * 100}%` }}
                      aria-hidden="true"
                    />
                  </div>
                </div>
                <span className="rounded border border-success/40 bg-success/15 px-2 py-0.5 text-xs text-foreground">
                  {log.status}
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 rounded-md border border-border bg-muted p-3">
          <div className="shrink-0 rounded-md border border-border bg-card p-2 text-primary">
            <CheckCircle2 size={16} aria-hidden="true" />
          </div>
          <div className="space-y-0.5">
            <h6 className="text-[length:var(--font-size-body)] font-semibold text-foreground">Shift-Left Quality Assurance</h6>
            <p className="text-xs leading-tight text-muted-foreground">
              테스트 가동 시 스레드 로컬 카운터가 데이터베이스 질의를 자동 카운팅하며, 임계값 초과 시 즉각 테스트를 강제 실패시켜 N+1 발생을 실시간 경보합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 허브의 부가 탭 레지스트리(`EXTRA_TAB_VIEWS`)에 등록하는 묶음. */
export const HARNESS_TAB_VIEW = {
  render: (props: { selectedItemId: string | number | null; onSelect: (id: string) => void }) => <HarnessAtlasTab {...props} />,
  overview: () => <HarnessDashboardOverview />,
  find: findHarnessItem,
  detail: harnessDetail,
};

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

export function SkillDetailView({ skill }: { skill: HarnessSkill }) {
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

export function TestDetailView({ test }: { test: HarnessTest }) {
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
