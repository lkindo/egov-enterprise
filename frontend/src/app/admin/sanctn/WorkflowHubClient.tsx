'use client';

// [데모 스캐폴드] '전자결재 워크플로우 허브'(FORMS/WORKFLOW/MONITOR 탭)는 정적 목업이다(하드코딩 양식/엔진상태, 백엔드 미연동).
// 실제 전자결재 기능은 /approvals·/admin/system/ism(InformalSanction 백엔드)에 별도 구현되어 동작 중.
// 결재양식 CRUD·엔진·배포를 실동작시키려면 대응 백엔드를 신설해 배선할 것.
// (진입점 /admin/sanctn/workflow는 메뉴 SSOT 정합상 /admin/workflow로 리다이렉트됨 — 이 컴포넌트는 /admin/sanctn/forms에서 렌더)
//
// [2026-09-20] 셸 이행은 하지 않았다 — 표시할 업무 데이터가 없는 데모 스캐폴드라 A1 셸을 씌우면
//   조회조건·총 건수 같은 셸의 약속이 전부 빈칸이 된다. 대신 장식·거짓 토큰·죽은 분기만 걷었다.
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GitBranch,
 FileText,
 Activity,
 Plus,
 Search,
 Zap,
 History,
 ArrowRight,
 MoreHorizontal,
 Workflow,
 Layers,
 UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Types ---
type ApprovalTab = 'FORMS' | 'WORKFLOW' | 'MONITOR';

interface ApprovalFormItem {
 id: string | number;
 title: string;
 version: string;
 status: '활성' | '초안' | '사용중단';
 usage: number;
}

/**
 * 양식 상태 배지. 색만으로 상태를 전달하지 않는다 — 한국어 라벨이 함께 있고 글자는 전경
 * 토큰으로 읽는다(WCAG 1.4.1). 팔레트 리터럴 대신 success/warning/destructive 틴트를 쓴다.
 */
const FORM_STATUS_CLASS: Record<ApprovalFormItem['status'], string> = {
 활성: 'border-success/40 bg-success/15 text-foreground',
 초안: 'border-warning/40 bg-warning/15 text-foreground',
 사용중단: 'border-border bg-muted text-muted-foreground',
};

export default function WorkflowHubClient({ defaultTab = 'FORMS' }: { defaultTab?: ApprovalTab }) {
 const [activeTab, setActiveTab] = useState<ApprovalTab>(defaultTab);
 const [selectedFormId, setSelectedFormId] = useState<string | number | null>(null);

 // --- Mock Data ---
 const forms: ApprovalFormItem[] = [
 { id: 'F01', title: '일반 지출 결의서', version: 'v2.4', status: '활성', usage: 1240 },
 { id: 'F02', title: '연차/휴가 신청서', version: 'v1.8', status: '활성', usage: 4500 },
 { id: 'F03', title: 'IT 자산 구매 요청', version: 'v3.0', status: '초안', usage: 0 },
 { id: 'F04', title: '프로젝트 법인카드 신청', version: 'v1.1', status: '사용중단', usage: 890 },
 ];

 const selectedForm = forms.find((form) => form.id === selectedFormId);

 return (
 <div className="space-y-4 pb-6">
  {/* --- Header --- */}
  <div className="flex flex-wrap items-start justify-between gap-3">
  <div>
  <h1 className="text-xl font-bold tracking-tight text-foreground">
  전자결재 워크플로우 허브
  </h1>
  <p className="mt-1 text-[length:var(--font-size-body)] text-muted-foreground">
  결재 양식·워크플로우 UI 정적 예시
  </p>
  </div>
  <Button disabled size="sm" title="정적 데모에서는 배포할 수 없습니다." className="gap-2">
  <Zap size={16} aria-hidden="true" /> 워크플로우 배포
  </Button>
  </div>

  <div role="status" className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-[length:var(--font-size-body)] leading-relaxed">
    <strong className="font-semibold">정적 데모 화면입니다.</strong>{' '}
    아래 양식·사용량·승인 단계·엔진 수치는 실제 결재 양식·엔진 상태·배포 결과가 아닙니다.
    탭 전환과 샘플 선택만 동작하며 생성·수정·실행·배포는 지원하지 않습니다.
  </div>

  <div className="grid grid-cols-12 gap-3">

  {/* --- Left Column: Navigation --- */}
  <div className="col-span-12 space-y-3 lg:col-span-3">
  <Card className="overflow-hidden rounded-md border border-border bg-card">
  <CardHeader className="border-b border-border bg-muted/50 p-3">
  <CardTitle className="flex items-center gap-2 text-[length:var(--font-size-body)] font-semibold text-muted-foreground">
  <Workflow size={14} className="text-primary" aria-hidden="true" /> 코어 엔진 모듈 관리 </CardTitle>
  </CardHeader>
  <CardContent className="space-y-1 p-2">
  {/* 종전 'Sanction Forms' 는 내부 영문 명칭이라 화면 라벨로 쓰지 않는다. */}
  <NavButton icon={<FileText size={16} />} label="결재 양식" active={activeTab === 'FORMS'} onClick={() => setActiveTab('FORMS')} />
  <NavButton icon={<GitBranch size={16} />} label="워크플로우" active={activeTab === 'WORKFLOW'} onClick={() => setActiveTab('WORKFLOW')} />
  <NavButton icon={<Activity size={16} />} label="시스템" active={activeTab === 'MONITOR'} onClick={() => setActiveTab('MONITOR')} />
  </CardContent>
  </Card>

  {/* Engine Status */}
  <Card className="rounded-md border border-surface-inverse-border bg-surface-inverse p-3 text-surface-inverse-foreground">
  <div className="space-y-2">
  {/* [2026-08-22] text-warning-foreground 는 bg-warning **위에서만** 대비가 성립하는 배지 전경
      토큰(38 95% 12%, 거의 검은 앰버)이다. surface-inverse(고정 다크 서피스) 위에 단독으로 쓰면
      1.40:1 로 라벨이 사실상 보이지 않는다(실측). 다크 서피스 위 텍스트는 --warning 자체가
      8.35:1 로 통과한다 — status-token-contrast 계약이 이 대비들을 수학으로 고정한다. */}
  <div className="flex items-center gap-2 text-[length:var(--font-size-body)] font-semibold text-warning">
  <div className="size-2 rounded-full bg-warning" aria-hidden="true" /> 정적 엔진 샘플
  </div>
  <div>
  <h2 className="text-lg font-semibold tabular-nums">99.9% 예시</h2>
  <p className="text-xs text-surface-inverse-foreground/70">실제 cluster 미연결</p>
  </div>
  </div>
  </Card>
  </div>

  {/* --- Content Area --- */}
  <div className="col-span-12 lg:col-span-9">
      {activeTab === 'FORMS' && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-9">
          {/* Center Column: Resource List */}
          <div className="lg:col-span-4">
            <Card className="flex h-full flex-col overflow-hidden rounded-md border border-border bg-card">
              <CardHeader className="space-y-2 border-b border-border bg-muted/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-[length:var(--font-size-body)] font-semibold text-muted-foreground">
                    <Layers size={14} className="text-primary" aria-hidden="true" /> 결재 양식 인벤토리
                  </CardTitle>
                  <Button disabled title="정적 데모에서는 양식을 추가할 수 없습니다." size="icon" variant="outline" aria-label="양식 추가 (미지원)"><Plus size={16} aria-hidden="true" /></Button>
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} aria-hidden="true" />
                  <Input disabled className="h-[var(--filter-control-h)] pl-9 text-[length:var(--font-size-body)]" placeholder="정적 데모에서는 검색을 지원하지 않습니다" />
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-1 overflow-y-auto p-2">
                {forms.map((form) => (
                  // 종전에는 role="button" + tabIndex + 수동 Enter/Space 처리였다. 실제 button 은
                  // 그 계약을 브라우저가 이미 구현해 두었고, 선택 상태도 aria-pressed 로 전달된다.
                  <button
                    key={form.id}
                    type="button"
                    aria-pressed={selectedFormId === form.id}
                    aria-label={`${form.title} 선택`}
                    onClick={() => setSelectedFormId(form.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors",
                      selectedFormId === form.id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary"
                    )}
                  >
                    {/* button 의 콘텐츠 모델은 phrasing 이라 내부는 전부 span 으로 둔다. */}
                    <span className="min-w-0 space-y-1">
                      <span className="flex items-center gap-2">
                        <span className={cn("inline-flex items-center rounded border px-1.5 py-0.5 text-xs", FORM_STATUS_CLASS[form.status])}>
                          {form.status}
                        </span>
                        <span className="text-xs tabular-nums text-muted-foreground">{form.version}</span>
                      </span>
                      <span className="block truncate text-[length:var(--font-size-body)] font-semibold text-foreground">
                        {form.title}
                      </span>
                      <span className="block text-xs text-muted-foreground">식별자 {form.id}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end">
                      <span className="text-xs text-muted-foreground">샘플 사용량</span>
                      <span className="text-[length:var(--font-size-body)] font-semibold tabular-nums text-foreground">
                        {form.usage.toLocaleString()}
                      </span>
                    </span>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Designer/Preview */}
          <div className="lg:col-span-5">
            {selectedForm ? (
              <Card className="flex h-full flex-col overflow-hidden rounded-md border border-border bg-card">
                <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-border bg-muted/50 p-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[length:var(--font-size-body)] font-semibold text-muted-foreground">
                      <Layers size={14} className="text-primary" aria-hidden="true" /> 승인 단계 예시
                    </p>
                    <h2 className="truncate text-lg font-semibold text-foreground">{selectedForm.title}</h2>
                  </div>
                  <Button disabled title="정적 데모에서는 추가 작업을 지원하지 않습니다." variant="ghost" size="icon" aria-label="추가 작업 (미지원)"><MoreHorizontal size={16} aria-hidden="true" /></Button>
                </CardHeader>

                <CardContent className="flex-1 bg-muted/40 p-4">
                  <div className="space-y-2">
                    <WorkflowNode type="START" label="기안자" date="문서 제출" />
                    <StepArrow />
                    <WorkflowNode type="APPROVE" label="부서 관리자" date="1차 승인" active />
                    <StepArrow />
                    <WorkflowNode type="APPROVE" label="재무 담당자" date="2차 검증" />
                    <StepArrow />
                    <WorkflowNode type="END" label="시스템" date="완료" />
                  </div>
                </CardContent>

                <div className="flex gap-2 border-t border-border bg-card p-3">
                  <Button disabled size="sm" title="정적 데모에서는 로직을 수정할 수 없습니다." variant="outline" className="flex-1">로직 수정</Button>
                  <Button disabled size="sm" title="정적 데모에서는 인스턴스를 실행할 수 없습니다." className="flex-[2]">인스턴스 실행</Button>
                </div>
              </Card>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-md border border-dashed border-border bg-card p-8 text-center">
                <GitBranch size={28} className="mb-3 text-muted-foreground" aria-hidden="true" />
                <h2 className="text-[length:var(--font-size-body)] font-semibold text-foreground">선택한 양식 없음</h2>
                <p className="mt-1 text-xs text-muted-foreground">승인 단계 예시를 보려면 왼쪽에서 양식을 선택하세요.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'WORKFLOW' && (
        <div className="flex flex-col items-center justify-center space-y-3 rounded-md border border-border bg-card p-8 text-center">
          <GitBranch size={28} className="text-muted-foreground" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-foreground">워크플로우 배포 관리</h2>
          <p className="mx-auto max-w-md text-[length:var(--font-size-body)] text-muted-foreground">워크플로우 관리 UI의 정적 예시입니다. 실제 인스턴스와 배포 정책은 연결되지 않았습니다.</p>
          <Button disabled size="sm" title="정적 데모에서는 워크플로우를 생성할 수 없습니다.">새 워크플로우 생성</Button>
        </div>
      )}

      {activeTab === 'MONITOR' && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <MonitorCard title="샘플 시스템 상태" value="Optimal" icon={<ShieldCheck size={16} aria-hidden="true" />} status="정적 예시" description="실제 시스템 상태가 아닌 화면 구성 예시입니다." />
          <MonitorCard title="샘플 엔진 가동률" value="42%" icon={<Zap size={16} aria-hidden="true" />} status="정적 예시" description="실제 처리 부하가 아닌 화면 구성 예시입니다." />
          <MonitorCard title="샘플 동시 세션" value="1,240" icon={<History size={16} aria-hidden="true" />} status="정적 예시" description="실제 사용자 세션이 아닌 화면 구성 예시입니다." />
        </div>
      )}
  </div>
  </div>
 </div>
 );
}

// --- Sub-components ---

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
 return (
 <button
 type="button"
 onClick={onClick}
 aria-pressed={active}
 className={cn(
 "flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors",
 active
 ? "border-surface-inverse-border bg-surface-inverse text-surface-inverse-foreground"
 : "border-transparent bg-card text-muted-foreground hover:border-border hover:text-foreground"
 )}
 >
 <span className="shrink-0" aria-hidden="true">{icon}</span>
 <span className="text-[length:var(--font-size-body)] font-semibold">{label}</span>
 </button>
 );
}

function StepArrow() {
 return (
 <div className="flex justify-center" aria-hidden="true">
 <ArrowRight size={16} className="rotate-90 text-muted-foreground" />
 </div>
 );
}

function MonitorCard({ title, value, icon, status, description }: { title: string, value: string, icon: React.ReactNode, status: string, description: string }) {
  return (
    <Card className="space-y-2 rounded-md border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          {icon}
        </span>
        {/*
          종전에는 status === 'Healthy' 분기로 색을 갈랐는데 호출부 3곳이 전부 '정적 예시' 라
          그 분기는 한 번도 참이 된 적이 없다. 없는 상태축을 색으로 흉내내지 않는다.
        */}
        <span className="rounded border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {status}
        </span>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="text-lg font-semibold tabular-nums text-foreground">{value}</p>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
    </Card>
  );
}

function WorkflowNode({
 type,
 label,
 date,
 active = false,
}: {
 type: 'START' | 'APPROVE' | 'END';
 label: string;
 date: string;
 active?: boolean;
}) {
 return (
 <div className={cn(
 "flex items-center gap-3 rounded-md border px-3 py-2 transition-colors",
 active ? "border-primary bg-card" : "border-border bg-card"
 )}>
 <span className={cn(
 "flex size-8 shrink-0 items-center justify-center rounded-md",
 type === 'START'
 ? "bg-surface-inverse text-surface-inverse-foreground"
 : type === 'END'
 ? "bg-success text-success-foreground"
 : "bg-primary text-primary-foreground"
 )} aria-hidden="true">
 {type === 'START' ? <UserCheck size={16} /> : type === 'END' ? <ShieldCheck size={16} /> : <Zap size={16} />}
 </span>
 <div className="min-w-0 flex-1">
 <p className="text-xs text-muted-foreground">{date}</p>
 <p className="truncate text-[length:var(--font-size-body)] font-semibold text-foreground">{label}</p>
 </div>
 {/* 진행 중 단계는 애니메이션이 아니라 글자로 말한다 — 깜빡임은 상태를 읽어 주지 않는다. */}
 {active && <span className="shrink-0 rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-xs text-foreground">현재 단계</span>}
 </div>
 );
}

function ShieldCheck({
 size = 24,
 ...props
}: React.SVGProps<SVGSVGElement> & { size?: number | string }) {
 return (
 <svg
 {...props}
 xmlns="http://www.w3.org/2000/svg"
 width={size}
 height={size}
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth="2"
 strokeLinecap="round"
 strokeLinejoin="round"
 >
 <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
 <path d="m9 12 2 2 4-4" />
 </svg>
 )
}
