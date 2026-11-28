import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import DOMPurify from 'isomorphic-dompurify';
import { helpUserService, type PublicSystemPolicy } from '@/services/business/user/help/HelpUserService';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Scale } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RICH_TEXT_CONTENT_CLASSES } from '@/lib/rich-text-styles';

export const metadata: Metadata = {
  title: `약관 및 정책 | ${SITE_IDENTITY.frameworkName}`,
};

/**
 * 시스템 정책 및 법률 약관 조회 페이지 (Server Component)
 *
 * 헌법 제3조(서버 컴포넌트 우선) 및 제11조 2항(하이드레이션 안전)을 만족합니다.
 * 'use client' 및 useState/useEffect를 걷어내고, 서버 사이드에서 데이터를 직접 로드하여 렌더링합니다.
 */

/** 화면이 스스로 만들어 낸 본문과 서버가 준 본문을 섞지 않기 위한 표현. */
type PolicyView =
  | { kind: 'loaded'; policy: PublicSystemPolicy }
  | { kind: 'not-registered'; type: string }
  | { kind: 'permission-wall'; type: string }
  | { kind: 'error'; type: string };

const TITLES: Record<string, string> = {
  privacy: '개인정보 처리 방침',
  copyright: '저작권 정책',
};

// [2026-11-08] 정책 PK 는 대문자다(PRIVACY·COPYRIGHT) — 주소가 대문자로 들어와도 대체 제목을 찾도록 대소문자를 가리지 않는다.
//   지금은 이 화면으로 가는 링크가 없다(바닥글 링크는 원문이 없어 걷었다 — footer.tsx 주석).
const titleFor = (type: string) => TITLES[type.toLowerCase()] ?? '약관 및 정책';

export default async function PolicyViewPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;

  let view: PolicyView;
  try {
    view = { kind: 'loaded', policy: await helpUserService.getPublicPolicy(type) };
  } catch (error) {
    /*
     * 실패 사유를 세 갈래로 구분한다.
     *
     * 이 화면은 로그인 사용자 열람 경로(/api/v1/policies/{type})에서 읽으며 미인증 401/403은 권한 안내로,
     * 미등록 404는 미등록 안내로 구분해 가짜 정책 본문을 만들어 내지 않는다.
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
              className={cn(RICH_TEXT_CONTENT_CLASSES, "text-lg leading-relaxed")}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(view.policy.plcyCn || '') }}
            />
          ) : (
            <p role="status" className="text-lg leading-relaxed text-muted-foreground">
              {view.kind === 'not-registered'
                ? '등록된 정책이 없습니다. 시스템 관리자가 등록하면 이곳에 표시됩니다.'
                : view.kind === 'permission-wall'
                  ? '이 정보를 열람할 권한이 필요합니다. 필요하면 시스템 관리자에게 문의해 주세요.'
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
