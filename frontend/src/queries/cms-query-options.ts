import { queryOptions } from '@tanstack/react-query';
import { cmsService } from '@/services/business/cms/CmsService';

/**
 * 관리 목록 조건(ADR-0042). ACTIVE 는 보관하지 않은 전체, PENDING 은 게시를 기다리는 페이지(한 번도 게시하지 않은 초안과 게시본과
 * 다른 저장 초안이 있는 게시 중 페이지), UNPUBLISHED 는 게시를 중지한 페이지다.
 */
export interface CmsPageListParams {
  keyword: string;
  status: 'ACTIVE' | 'PENDING' | 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | 'ARCHIVED';
  page: number;
  size: number;
}

export interface CmsPublishedListParams {
  keyword: string;
  page: number;
  size: number;
}

export const cmsKeys = {
  all: ['cms'] as const,
  lists: () => [...cmsKeys.all, 'list'] as const,
  list: (params: CmsPageListParams) => [...cmsKeys.lists(), params] as const,
  detail: (contsSn: number) => [...cmsKeys.all, 'detail', contsSn] as const,
  revisions: (contsSn: number) => [...cmsKeys.all, 'revisions', contsSn] as const,
  revision: (contsSn: number, contsRvsnSn: number) => [...cmsKeys.all, 'revision', contsSn, contsRvsnSn] as const,
  home: () => [...cmsKeys.all, 'home'] as const,
  homeIntro: () => [...cmsKeys.all, 'home-intro'] as const,
  published: (params: CmsPublishedListParams) => [...cmsKeys.all, 'published', params] as const,
};

export const cmsQueryOptions = {
  list: (params: CmsPageListParams) => queryOptions({
    queryKey: cmsKeys.list(params),
    queryFn: () => cmsService.getPages(params),
  }),
  detail: (contsSn: number) => queryOptions({
    queryKey: cmsKeys.detail(contsSn),
    queryFn: () => cmsService.getPage(contsSn),
  }),
  revisions: (contsSn: number) => queryOptions({
    queryKey: cmsKeys.revisions(contsSn),
    queryFn: () => cmsService.getRevisions(contsSn),
  }),
  revision: (contsSn: number, contsRvsnSn: number) => queryOptions({
    queryKey: cmsKeys.revision(contsSn, contsRvsnSn),
    queryFn: () => cmsService.getRevision(contsSn, contsRvsnSn),
  }),
  home: () => queryOptions({
    queryKey: cmsKeys.home(),
    queryFn: () => cmsService.getHome(),
  }),
  /** 사용자 화면의 안내 페이지 목록(ADR-0042). */
  published: (params: CmsPublishedListParams) => queryOptions({
    queryKey: cmsKeys.published(params),
    queryFn: () => cmsService.getPublishedPages(params),
  }),
  /** 업무 홈 맨 위 소개. 지정이 없으면 null 이고 조각을 그리지 않는다. */
  homeIntro: () => queryOptions({
    queryKey: cmsKeys.homeIntro(),
    queryFn: () => cmsService.getHomeIntro(),
    staleTime: 60_000,
  }),
};

/** 업무 홈 소개 조회. 업무 홈 기여(extensions/cms/home-sections)가 서버에서 미리 채우고 조각이 같은 값으로 읽는다. */
export const cmsHomeIntroQuery = cmsQueryOptions.homeIntro();
