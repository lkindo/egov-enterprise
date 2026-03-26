import { useQuery } from '@tanstack/react-query';
import { userService } from '@/services/business/user/userService';

export const USER_QUERY_KEY = ['user', 'me'] as const;

export function useUser() {
 return useQuery({
 queryKey: USER_QUERY_KEY,
 queryFn: () => userService.getMe(),
 // 로그인이 안 된 상태에서도 에러 로그를 남기지 않도록 retry 방지 등 설정
 retry: false,
 staleTime: 5 * 60 * 1000, // 5분간 유효
 });
}
