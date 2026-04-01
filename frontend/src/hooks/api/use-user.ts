import { useQuery } from '@tanstack/react-query';
import { userService } from '@/services/business/user/userService';

export const USER_QUERY_KEY = ['user', 'me'] as const;

export function useUser() {
 return useQuery({
 queryKey: USER_QUERY_KEY,
 queryFn: () => userService.getMe(),
 // 濡쒓렇?몄씠 님님?곹깭?먯꽌님?먮윭 濡쒓렇瑜님④린吏 ?딅룄濡?retry 諛⑹? 님?ㅼ젙
 retry: false,
 staleTime: 5 * 60 * 1000, // 5遺꾧컙 ?좏슚
 });
}
