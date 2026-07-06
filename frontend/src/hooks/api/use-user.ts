import { useQuery } from '@tanstack/react-query';
import { userService } from '@/services/business/user/userService';

export const USER_QUERY_KEY = ['user', 'me'] as const;

export function useUser() {
 return useQuery({
 queryKey: USER_QUERY_KEY,
 queryFn: () => userService.getMe(),
 // 로그?몄씠 ...?곹깭?먯꽌님?먮윭 로그를④린吏 ?딅룄濡retry 諛⑹ 님ㅼ젙
 retry: false,
 staleTime: 5 * 60 * 1000, // 5遺꾧컙 ?좏슚
 });
}
