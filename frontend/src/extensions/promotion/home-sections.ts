import { defineContributions } from '@/extensions/slots';
import { HomeBannerSlider, HomePopupManager } from '@/app/components/dashboard/PromotionHome';

/**
 * 배너·팝업 → 업무 홈 기여(Phase 2 9단계). 공지 팝업과 홍보 배너다. 배너·팝업이 빠진 구성에서는 이 파일이 기능과 함께 직접 지워져 이
 * 조각만 사라진다.
 *
 * 노출은 조각이 부르는 사용자 API 의 권한이다 — 팝업은 활성 팝업 API(POPUP_READ), 배너는 노출 배너 API(BANNER_READ)(사용자 결정 B5).
 * 종전에는 늘 그려 권한이 없는 사용자에게 조회 403 을 콘솔 오류로 남기고 빈 자리만 보였다. 기본 그룹은 셋 모두 두 권한을 가져 화면이
 * 같다. 노출일 뿐 인가는 서버가 한다(H3).
 */
export default defineContributions('home-sections', [
  {
    id: 'popup',
    placement: 'overlay',
    order: 10,
    Component: HomePopupManager,
    visibleWhen: { permissions: ['POPUP_READ'] },
  },
  {
    id: 'banner',
    placement: 'bottom',
    order: 10,
    Component: HomeBannerSlider,
    visibleWhen: { permissions: ['BANNER_READ'] },
  },
]);
