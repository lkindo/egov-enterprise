import { defineContributions } from '@/extensions/slots';
import { CmsHomeIntro } from '@/components/cms/CmsHomeIntro';
import { cmsHomeIntroQuery } from '@/queries/cms-query-options';

/**
 * 콘텐츠 페이지 → 업무 홈 기여(ADR-0039 결정 2). 업무 홈을 대체하지 않고, 운영자가 지정한 게시 페이지를 머리 바로 아래 소개로 보인다.
 * 콘텐츠 페이지 기능이 빠진 구성에서는 이 파일이 기능과 함께 지워져 소개 자리만 사라진다.
 *
 * 노출은 조회 API 의 인가와 같다 — 게시본 열람은 로그인만 요구하므로 늘 보인다(지정이 없으면 조각이 아무것도 그리지 않는다).
 * 조회 실패는 홈 전체를 막지 않고 이 구역이 스스로 알린다(section).
 */
export default defineContributions('home-sections', [
  {
    id: 'cms-home-intro',
    placement: 'hero',
    order: 10,
    Component: CmsHomeIntro,
    prefetch: [{ query: cmsHomeIntroQuery, failure: 'section' }],
    visibleWhen: { always: '게시본 열람은 로그인만 요구한다 — 지정이 없거나 게시 중이 아니면 조각이 아무것도 그리지 않는다.' },
  },
]);
