'use client';

import { Copy, ExternalLink, Home, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/app/components/ui/toast';
import { cmsPageRoute } from '@/lib/cms/page-menu-links';
import { copyText } from './PageMenuLinksPanel';

export interface PageNextStepsProps {
  contsPathNm: string;
  /**
   * 일반 그룹에 보이는 활성 메뉴가 있는가(route-menu-links 의 generalMenuState). 확인하는 중이면 null 이다. 'fail' 일 때만 경고한다 —
   * 확인할 수 없는 것('unknown')을 메뉴 없음으로 단정하지 않는다.
   */
  menuState: 'pass' | 'fail' | 'unknown' | null;
  /** 메뉴 관리에 이 화면을 넘길 수 있다(화면 관리와 같은 기준 — 메뉴 등록·수정 권한과 메뉴 관리 화면 접근). */
  canAddMenu: boolean;
  onAddToMenu: () => void;
  /** 업무 홈 소개 단추. 업무 홈 지정 권한(CMS_HOME_UPDATE)이 없으면 null 이다. */
  home: { isHome: boolean; pending: boolean; disabled: boolean; onToggle: () => void } | null;
}

/**
 * 게시 중인 페이지의 다음 단계(ADR-0042). 게시는 주소를 아는 로그인 사용자가 읽을 수 있게 할 뿐이다 — 사용자가 찾게 하려면 메뉴에
 * 연결해야 한다. 그래서 게시본 확인·주소 전달·메뉴 연결·업무 홈 소개를 한곳에 둔다. 메뉴 관리 권한이 없으면 메뉴 연결을 맡을 사람에게
 * 주소를 전하도록 안내한다.
 */
export function PageNextSteps({ contsPathNm, menuState, canAddMenu, onAddToMenu, home }: PageNextStepsProps) {
  const { toast } = useToast();
  const route = cmsPageRoute(contsPathNm);
  const copyAddress = () => {
    const url = typeof window === 'undefined' ? route : new URL(route, window.location.origin).toString();
    void copyText(url, toast, '페이지 주소를 복사했습니다.');
  };

  return (
    <section aria-labelledby="cms-page-next-steps" className="space-y-2 rounded-md border border-border bg-muted/40 px-3 py-3">
      <h3 id="cms-page-next-steps" className="text-sm font-semibold text-foreground">게시한 뒤 할 일</h3>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <a href={route} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={16} aria-hidden="true" /> 게시본 열기<span className="sr-only"> (새 창)</span>
          </a>
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={copyAddress}>
          <Copy size={16} aria-hidden="true" /> 주소 복사
        </Button>
        {canAddMenu && (
          <Button type="button" variant="outline" size="sm" onClick={onAddToMenu}>
            <Link2 size={16} aria-hidden="true" /> 메뉴에 추가
          </Button>
        )}
        {home && (
          <Button type="button" variant="outline" size="sm" onClick={home.onToggle} disabled={home.disabled} aria-busy={home.pending}>
            <Home size={16} aria-hidden="true" /> {home.isHome ? '업무 홈 소개에서 내리기' : '업무 홈 소개로 보이기'}
          </Button>
        )}
      </div>
      {!canAddMenu && (
        <p className="text-sm text-muted-foreground">
          메뉴 연결은 메뉴 관리 권한(메뉴 등록·수정) 보유자에게 요청하세요. ‘주소 복사’로 이 페이지의 주소를 전할 수 있습니다.
        </p>
      )}
      {menuState === 'fail' && (
        <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground">
          일반 사용자가 볼 수 있는 메뉴가 없습니다 — 메뉴를 일반 사용자 그룹이 보는 영역에 두고 그 그룹의 메뉴 표시를 켜세요.
          지금은 주소를 아는 사람만 이 페이지를 엽니다.
        </p>
      )}
    </section>
  );
}
