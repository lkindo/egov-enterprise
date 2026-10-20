'use client';

import { useState, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { Banner, Popup } from '@/types/foundation/banner';
import { Image as ImageIcon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pickAllowedParams } from '@/lib/navigation/allowlist-params';
import { useBannerAssetsPanel } from './BannerAssetsPanel';
import { usePopupAssetsPanel } from './PopupAssetsPanel';
import { usePromotionWriteCoordination, type PromotionAssetKind } from './promotion-asset-form';

/*
  [2026-10-20] 배너/팝업 관리 셸. 종전에는 이 한 파일(1,140줄)이 배너·팝업의 조회·표·등록 창·삭제를 토글로 오가며 모두 들고 있었다.
  자산별 조각을 BannerAssetsPanel·PopupAssetsPanel 로 나눴고(DEC-OPS-346·361 선례, 동작 변경 없음), 이 셸은 URL(탭·페이지)·페이지
  크기·쓰기 잠금과 업무 목록 셸 조립만 소유한다. 셸 하나가 그대로 남으므로 탭을 바꿔도 머리글·토글이 다시 그려지지 않는다(초점이 남는다).
*/

/**
 * 이 라우트가 URL 에 싣는 쿼리 키 전수. 탭과 페이지를 함께 읽는다.
 *
 * 종전에는 들어온 쿼리를 통째로 복사해 재발행했다 — 모르는 이름이 한 번 들어오면 이동마다
 * 다시 붙는 캐리어였다(DEC-OPS-029 Q2). 새 파라미터를 도입하면 이 목록에 함께 넣어야 하고,
 * 빠뜨리면 이동 시 조용히 사라진다.
 */
const LIST_PARAM_KEYS = ['page', 'tab'] as const;

interface BannerAdminClientProps {
  initialBanners: Banner[];
  initialPopups: Popup[];
}

/** 페이지당 건수 기본값(A1 필수 — 사용자가 바꿀 수 있다). URL 에는 싣지 않는다. */
const DEFAULT_PAGE_SIZE = 20;

export default function BannerAdminClient({ initialBanners, initialPopups }: BannerAdminClientProps) {
  /*
   * [P1-7] 탭·페이지를 URL 에 반영한다. activeTab/page 는 URL 파생값이라
   * 공유·새로고침·뒤로가기가 그대로 복원되고 사이드바 활성 표시도 유지된다.
   * (검색어는 이 화면에 없으므로 URL 반영 대상 자체가 없다.)
   */
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTab: PromotionAssetKind = searchParams.get('tab') === 'popup' ? 'popup' : 'banner';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const syncUrl = useCallback((tab: PromotionAssetKind, nextPage: number) => {
    const params = pickAllowedParams(searchParams, LIST_PARAM_KEYS);
    params.set('tab', tab);
    params.set('page', String(nextPage));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, searchParams]);

  /** 탭 전환 시 페이지는 1로 리셋한다(3페이지에서 탭을 바꾸면 빈 목록이 되던 문제). */
  const setTab = useCallback((tab: PromotionAssetKind) => syncUrl(tab, 1), [syncUrl]);
  const setPage = useCallback((nextPage: number) => syncUrl(activeTab, nextPage), [syncUrl, activeTab]);

  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  // 배너·팝업 어느 쪽이든 쓰기(검증·저장·삭제)는 한 번에 하나다 — 셸이 두 패널의 잠금과 삭제 중 표시를 잇는다.
  const coordination = usePromotionWriteCoordination();
  const shared = { page, pageSize, onPageChange: setPage, changePageSize: setPageSize, coordination };

  const bannerAssets = useBannerAssetsPanel({ ...shared, active: activeTab === 'banner', initialItems: initialBanners });
  const popupAssets = usePopupAssetsPanel({ ...shared, active: activeTab === 'popup', initialItems: initialPopups });
  const activeAssets = activeTab === 'banner' ? bannerAssets : popupAssets;

  return (
    <>
      <WorkListPage
        title="배너/팝업 관리"
        description={activeTab === 'banner'
          ? '포털 메인·서브 영역에 노출되는 배너를 조회하고 게시 상태를 관리합니다.'
          : '기간을 지정해 노출하는 공지 팝업을 조회하고 게시 상태를 관리합니다.'}
        breadcrumbItems={[{ label: '시스템 관리' }, { label: '홍보 관리' }]}
        filterStateKey="system-banner"
        totalCount={activeAssets.error ? undefined : activeAssets.total}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/*
            토글 시맨틱은 aria-pressed 다. role="tab" 으로 바꾸지 않는다 —
            e2e POM(PromotionPage.ts)이 getByRole('button', {name:/배너 설정/}) 로 잡고 있어
            역할을 바꾸면 타 소유 파일까지 동반 수정해야 한다.
          */}
            <div className="flex rounded-md border border-border p-0.5">
              <button
                type="button"
                aria-pressed={activeTab === 'banner'}
                onClick={() => setTab('banner')}
                className={cn(
                  'flex h-[var(--control-h-sm)] items-center gap-2 rounded px-4 text-xs font-bold transition-colors',
                  activeTab === 'banner' ? 'bg-muted text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <ImageIcon size={14} aria-hidden="true" /> 배너 설정
              </button>
              <button
                type="button"
                aria-pressed={activeTab === 'popup'}
                onClick={() => setTab('popup')}
                className={cn(
                  'flex h-[var(--control-h-sm)] items-center gap-2 rounded px-4 text-xs font-bold transition-colors',
                  activeTab === 'popup' ? 'bg-muted text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Monitor size={14} aria-hidden="true" /> 팝업 설정
              </button>
            </div>
            {activeAssets.createButton}
          </div>
        }
        toolbarActions={
          /* 지표 카드 4장을 한 줄 요약으로 수렴한다. '전체 자산'(단순 합)과 장식 카드는 제거했고,
             서버 집계가 없는 '예약 자산'은 현재 페이지 기준임을 문구로 밝힌다. */
          <span className="text-[length:var(--font-size-body)] text-muted-foreground">
            배너 <span className="font-bold text-foreground">{bannerAssets.error ? '조회 실패' : bannerAssets.total}</span> ·
            팝업 <span className="font-bold text-foreground">{popupAssets.error ? '조회 실패' : popupAssets.total}</span>
            {/* 게시 예정 수는 '게시 여부' 열과 같은 판정·같은 오늘로 센다. 오늘을 모르는 서버 렌더에서는 요약을 두지 않는다. */}
            {activeTab === 'popup' && popupAssets.scheduledOnPage !== null && (
              <> · 현재 페이지 게시 예정 <span className="font-bold text-foreground">
                {popupAssets.scheduledOnPage}
              </span>건</>
            )}
          </span>
        }
      >
        {/* 배너/팝업은 키 필드가 달라 union 캐스팅 대신 타입별로 분리 렌더한다. */}
        {activeAssets.table}
      </WorkListPage>

      {bannerAssets.modal}
      {popupAssets.modal}
    </>
  );
}
