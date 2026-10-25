'use client';

import Link from 'next/link';
import { PencilLine } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { buttonVariants } from '@/components/ui/button';
import { canOpenPage } from '@/lib/auth/page-access';
import { canPermission } from '@/lib/auth/permissions';
import { handOffContentPage } from '@/lib/cms/editor-handoff';
import { cn } from '@/lib/utils';

/** 콘텐츠 페이지 관리 화면. */
const EDITOR_ROUTE = '/admin/system/content-pages';

/**
 * 게시된 페이지에서 관리 화면의 그 페이지 편집으로 가는 링크(ADR-0042). 관리 화면을 열 수 있는 사람(CMS_ADMIN_READ 와 그 화면의
 * 진입 판정)에게만 보인다. 누르면 주소를 이 탭에 넘기고 관리 화면이 그 페이지를 고른다 — URL 에는 싣지 않는다. 고르기만 하며 편집·게시
 * 권한은 서버가 그대로 집행한다.
 */
export function EditThisPageLink({ contsPathNm }: { contsPathNm: string }) {
  const { user } = useAuth();
  if (!canPermission(user, 'CMS_ADMIN_READ') || !canOpenPage(user, EDITOR_ROUTE)) return null;
  return (
    <Link
      href={EDITOR_ROUTE}
      onClick={() => {
        // 저장소를 쓸 수 없으면 관리 화면이 고르지 않은 채 열린다 — 이동 자체는 막지 않는다.
        handOffContentPage(contsPathNm);
      }}
      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'shrink-0')}
    >
      <PencilLine aria-hidden="true" />
      이 페이지 편집
    </Link>
  );
}
