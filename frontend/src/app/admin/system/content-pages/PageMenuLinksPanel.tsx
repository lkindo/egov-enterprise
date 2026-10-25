'use client';

import { useRouter } from 'next/navigation';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/app/components/ui/toast';
import { useAuth } from '@/contexts/AuthContext';
import { canOpenPage } from '@/lib/auth/page-access';
import { handOffMenuFocus } from '@/lib/navigation/target-handoff';
import type { GroupSource, MenuExposure, MenuSource } from '@/lib/navigation/route-menu-links';
import { cmsPageRoute, type CmsPageMenuLink, type CmsPageMenuLinks } from '@/lib/cms/page-menu-links';

const MENUS_ROUTE = '/admin/system/menus';

export function exposureText(exposure: MenuExposure): string {
  switch (exposure.kind) {
    case 'inactive': return '— (메뉴 비활성)';
    case 'hidden': return '어느 그룹에도 보이지 않음';
    case 'admin-only': return `관리자 그룹만: ${exposure.groups.join(', ')}`;
    case 'general': return `일반 그룹 표시: ${exposure.groups.join(', ')}`;
    case 'no-permission': return '확인 권한 없음';
    case 'unknown': return '확인 불가';
  }
}

/** 화면 주소를 클립보드에 넣는다. 실패하면 직접 복사하라고 알린다. */
export async function copyText(text: string, toast: (message: string, type: 'success' | 'error') => void, done: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast(done, 'success');
  } catch {
    toast('주소를 복사하지 못했습니다. 직접 선택해 복사하세요.', 'error');
  }
}

interface PageMenuLinksPanelProps {
  contsPathNm: string;
  title: string;
  /** 판정 결과. 원천을 확인하는 중이면 null 이다. */
  links: CmsPageMenuLinks | null;
  menuSource: MenuSource | null;
  groupSource: GroupSource | null;
  retry: () => void;
}

/**
 * 콘텐츠 페이지의 '메뉴 연결'(ADR-0042). 이 페이지(`/pages/<주소>`)를 가리키는 메뉴와 그 메뉴가 어느 그룹의 사이드바에 보이는지를
 * 계산해 보이기만 한다 — 바꾸기는 메뉴 관리에서 한다(게시판 운영 화면의 메뉴 연결 표와 같은 판정·모양, ADR-0040 결정 8).
 * 메뉴 원장(MENU_READ)이나 그룹(AUTHRT_READ)을 볼 권한이 없으면 '확인 권한 없음', 불러오지 못하면 '확인 불가' 로 보이고 다시
 * 불러오게 한다 — 연결 없음·모두에게 보임으로 추정하지 않는다.
 */
export function PageMenuLinksPanel({ contsPathNm, title, links, menuSource, groupSource, retry }: PageMenuLinksPanelProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const canOpenMenus = canOpenPage(user, MENUS_ROUTE);
  const route = cmsPageRoute(contsPathNm);
  const failed = menuSource?.status === 'failed' || groupSource?.status === 'failed';

  const openMenu = (link: CmsPageMenuLink) => {
    if (!handOffMenuFocus({ menuSn: link.menuNo })) {
      toast('메뉴를 넘기지 못했습니다. 브라우저 저장소를 쓸 수 없는 상태입니다. 메뉴 관리에서 직접 찾아 주세요.', 'error');
      return;
    }
    router.push(MENUS_ROUTE);
  };

  return (
    <section aria-labelledby="cms-page-menu-links" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id="cms-page-menu-links" className="text-base font-semibold text-foreground">메뉴 연결</h3>
        {failed && <Button type="button" variant="outline" size="sm" onClick={retry}>다시 불러오기</Button>}
      </div>
      {links === null && <p role="status" className="text-sm text-muted-foreground">메뉴 연결을 확인하는 중…</p>}
      {links?.status === 'no-permission' && (
        <p className="text-[length:var(--font-size-body)] text-muted-foreground">
          메뉴 원장을 볼 권한(MENU_READ)이 없어 메뉴 연결을 확인할 수 없습니다(확인 권한 없음).
        </p>
      )}
      {links?.status === 'unknown' && (
        <p role="alert" className="text-[length:var(--font-size-body)] text-destructive">
          메뉴 원장을 불러오지 못해 메뉴 연결을 확인할 수 없습니다(확인 불가). ‘다시 불러오기’를 눌러 주세요.
        </p>
      )}
      {links?.status === 'ready' && links.links.length > 0 && (
        <div className="relative overflow-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">{`${title} 메뉴 연결`}</caption>
            <thead className="bg-muted">
              <tr>{['메뉴 위치', '메뉴 상태', '보이는 그룹', '고치는 곳'].map((name) => <th key={name} scope="col" className="p-3">{name}</th>)}</tr>
            </thead>
            <tbody>
              {links.links.map((link) => (
                <tr key={link.menuNo} className="border-t border-border align-top">
                  <th scope="row" className="p-3 font-medium">
                    {link.path.join(' › ')}
                    <p className="mt-1 break-all font-mono text-xs font-normal text-muted-foreground">{link.route}</p>
                  </th>
                  <td className="p-3">{link.exposure.kind === 'inactive' ? '비활성' : '활성'}</td>
                  <td className="p-3">{exposureText(link.exposure)}</td>
                  <td className="p-3">
                    {canOpenMenus
                      ? (
                        <Button type="button" variant="outline" size="sm" aria-label={`${link.menuNm} 메뉴 관리에서 열기`}
                          onClick={() => openMenu(link)}>
                          메뉴 관리에서 열기
                        </Button>
                      )
                      : <span className="text-muted-foreground">메뉴 관리(메뉴 조회 권한 필요)</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {links?.status === 'ready' && links.links.length === 0 && (
        <div className="space-y-2 rounded-md border border-border p-4 text-[length:var(--font-size-body)]">
          <p className="font-medium text-foreground">이 페이지를 가리키는 메뉴가 없습니다(연결 없음).</p>
          <p className="text-muted-foreground">메뉴 관리에서 새 메뉴를 추가하고 아래 주소를 메뉴 경로로 등록하세요.</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="break-all rounded bg-muted px-2 py-1 font-mono text-xs">{route}</code>
            <Button type="button" variant="outline" size="sm" className="gap-1.5" aria-label="메뉴에 등록할 주소 복사"
              onClick={() => void copyText(route, toast, '메뉴에 등록할 주소를 복사했습니다.')}>
              <Copy className="size-4" aria-hidden="true" />
              주소 복사
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
