import { queryOptions } from '@tanstack/react-query';
import { cmsService } from '@/services/business/cms/CmsService';

export interface CmsPageListParams {
  keyword: string;
  status: 'ACTIVE' | 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
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
  /** 업무 홈 맨 위 소개. 지정이 없으면 null 이고 조각을 그리지 않는다. */
  homeIntro: () => queryOptions({
    queryKey: cmsKeys.homeIntro(),
    queryFn: () => cmsService.getHomeIntro(),
    staleTime: 60_000,
  }),
};
