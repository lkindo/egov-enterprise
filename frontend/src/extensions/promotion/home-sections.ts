import { defineContributions } from '@/extensions/slots';
import { HomeBannerSlider, HomePopupManager } from '@/app/components/dashboard/PromotionHome';

/**
 * 배너·팝업 → 업무 홈 기여(Phase 2 9단계). 공지 팝업과 홍보 배너다. 배너·팝업이 빠진 구성에서는 이 파일이 기능과 함께 직접 지워져 이
 * 조각만 사라진다.
 */
export default defineContributions('home-sections', [
  {
    id: 'popup',
    placement: 'overlay',
    order: 10,
    Component: HomePopupManager,
    visibleWhen: { always: '팝업 조회가 실패하면 컴포넌트가 스스로 아무것도 그리지 않는다.' },
  },
  {
    id: 'banner',
    placement: 'bottom',
    order: 10,
    Component: HomeBannerSlider,
    visibleWhen: { always: '배너 조회가 실패하거나 배너가 없으면 컴포넌트가 스스로 아무것도 그리지 않는다.' },
  },
]);
