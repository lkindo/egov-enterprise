import {
  mutationOptions,
  queryOptions,
  type QueryClient,
} from '@tanstack/react-query';
import {
  scrapService,
  type Scrap,
  type ScrapListParams,
} from '@/services/business/user/ScrapService';

export const scrapKeys = {
  all: ['scraps'] as const,
  lists: () => [...scrapKeys.all, 'list'] as const,
  list: (params: ScrapListParams) => [...scrapKeys.lists(), params] as const,
  details: () => [...scrapKeys.all, 'detail'] as const,
  detail: (scrapSn: number) => [...scrapKeys.details(), scrapSn] as const,
};

export const scrapQueryOptions = {
  list: (params: ScrapListParams) => queryOptions({
    queryKey: scrapKeys.list(params),
    queryFn: () => scrapService.getMyScraps(params),
  }),
  detail: (scrapSn: number) => queryOptions({
    queryKey: scrapKeys.detail(scrapSn),
    queryFn: () => scrapService.getScrap(scrapSn),
    enabled: Number.isSafeInteger(scrapSn) && scrapSn > 0,
  }),
};

export const scrapMutationOptions = {
  create: (queryClient: QueryClient) => mutationOptions({
    mutationFn: async (data: Scrap) => {
      const scrapSn = await scrapService.createScrap(data);
      await queryClient.invalidateQueries({ queryKey: scrapKeys.lists() });
      return scrapSn;
    },
  }),
  update: (queryClient: QueryClient) => mutationOptions({
    mutationFn: async ({ scrapSn, data }: { scrapSn: number; data: Scrap }) => {
      await scrapService.updateScrap(scrapSn, data);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: scrapKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: scrapKeys.detail(scrapSn) }),
      ]);
    },
  }),
  remove: (queryClient: QueryClient) => mutationOptions({
    mutationFn: async (scrapSn: number) => {
      await scrapService.deleteScrap(scrapSn);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: scrapKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: scrapKeys.detail(scrapSn) }),
      ]);
    },
  }),
};
