import DOMPurify from 'isomorphic-dompurify';
import { policyAdminService, SystemPolicy } from '@/services/foundation/system/PolicyAdminService';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Scale } from 'lucide-react';

/**
 * 시스템 정책 및 법률 약관 조회 페이지 (Server Component)
 *
 * 헌법 제3조(서버 컴포넌트 우선) 및 제11조 2항(하이드레이션 안전)을 만족합니다.
 * 'use client' 및 useState/useEffect를 걷어내고, 서버 사이드에서 데이터를 직접 로드하여 렌더링합니다.
 */

/** 화면이 스스로 만들어 낸 본문과 서버가 준 본문을 섞지 않기 위한 표현. */
type PolicyView =
  | { kind: 'loaded'; policy: SystemPolicy }
  | { kind: 'not-registered'; type: string }
  | { kind: 'permission-wall'; type: string }
  | { kind: 'error'; type: string };

const TITLES: Record<string, string> = {
  privacy: '개인정보 처리 방침',
  copyright: '저작권 정책',
};

const titleFor = (type: string) => TITLES[type] ?? '약관 및 정책';

export default async function PolicyViewPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;

  let view: PolicyView;
  try {
    view = { kind: 'loaded', policy: await policyAdminService.getPolicy(type) };
  } catch (error) {
    /*
     * [2026-08-28] 실패 사유를 세 갈래로 구분한다.
     *
     * 이 화면은 본문을 /api/v1/admin/system/policies/{type} 에서 읽는데, ApiSecurityConfig 가
     * /api/v1/admin/** 를 ROLE_ADMIN·ROLE_SYSTEM 으로 제한한다. 즉 **일반 사용자에게는 영구히
     * 403** 이다. 종전 폴백은 '잠시 후 다시 시도해 주세요' 라고 안내해 일시적 장애처럼 보이게
     * 했고, 사용자는 새로고침을 반복하게 된다 — 권한 문제는 기다려도 해소되지 않는다.
     *
     * 404(미등록)는 이번에 새로 구분한다. 종전에는 서버가 본문을 **지어내서** 200 으로
     * 돌려줬기 때문에 이 갈래가 존재할 수 없었다 — 신규 설치의 기본 상태가 "가짜 개인정보
     * 처리방침을 진짜처럼 게시" 였다. 없는 것은 없다고 말한다.
     *
     * 비관리자도 읽을 수 있는 공개 조회 경로를 여는 것은 신규 API 표면이자 라우트 인가
     * 완화라 별도 결정이다.
     */
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 404) view = { kind: 'not-registered', type };
    else if (status === 401 || status === 403) view = { kind: 'permission-wall', type };
    else view = { kind: 'error', type };
  }

  const heading = view.kind === 'loaded' ? (view.policy.plcyTtl || titleFor(type)) : titleFor(type);

  return (
    <div className="container mx-auto py-20 px-6 max-w-4xl animate-in slide-in-from-bottom-5 duration-700">
      <HubHeader
        headingLevel={1}
        title={heading}
        subtitle="POLICY & LEGAL"
        icon={Scale}
        className="mb-12"
      />

      <Card className="border-none shadow-2xl bg-card/50 backdrop-blur-sm rounded-lg overflow-hidden">
        <CardContent className="p-12">
          {view.kind === 'loaded' ? (
            <div
              className="prose prose-slate dark:prose-invert max-w-none text-lg leading-relaxed"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(view.policy.plcyCn || '') }}
            />
          ) : (
            <p role="status" className="text-lg leading-relaxed text-muted-foreground">
              {view.kind === 'not-registered'
                ? '등록된 정책이 없습니다. 시스템 관리자가 등록하면 이곳에 표시됩니다.'
                : view.kind === 'permission-wall'
                  ? '이 정책 본문은 현재 관리자만 열람할 수 있습니다. 필요하면 시스템 관리자에게 문의해 주세요.'
                  : '정책 내용을 불러오지 못했습니다.'}
            </p>
          )}
        </CardContent>
      </Card>

      {/*
        [2026-08-28] '최종 수정일: {오늘}' 을 제거했다.

        종전에는 `new Date()` 를 그대로 찍어 **정책을 언제 고쳤든 항상 오늘 날짜**가 나왔다.
        법적 효력을 갖는 문서에 지어낸 시행일을 붙인 셈이다. 실제 수정 시각을 표시하려면
        서버 응답(SystemPolicy)에 그 필드가 있어야 하는데 지금은 없다 — DTO 확장은 계약
        변경이라 별건이다. 없는 값을 만들어 내는 대신 아무것도 쓰지 않는다.
      */}
    </div>
  );
}
