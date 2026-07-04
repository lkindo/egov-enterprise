import { useQuery } from '@tanstack/react-query';
import { userService } from '@/services/business/user/userService';

export const USER_QUERY_KEY = ['user', 'me'] as const;

export function useUser() {
  return useQuery({
    queryKey: USER_QUERY_KEY,
    queryFn: () => userService.getMe(),
    // 비로그인 상태에서 401 에러 로그가 반복 출력되지 않도록 retry 방지
    retry: false,
    staleTime: 5 * 60 * 1000, // 5분간 유효
  });
}
