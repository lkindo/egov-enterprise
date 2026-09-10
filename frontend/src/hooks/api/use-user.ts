import { useQuery } from '@tanstack/react-query';
import { userService } from '@/services/business/user/userService';
import { useAuth } from '@/contexts/AuthContext';

export const USER_QUERY_KEY = ['user', 'me'] as const;

export function useUser() {
 const { user } = useAuth();
 return useQuery({
 queryKey: [...USER_QUERY_KEY, user?.id ?? null, user?.authorizationVersion ?? ''],
 queryFn: () => userService.getMe(),
 enabled: !!user,
 retry: false,
 staleTime: 5 * 60 * 1000,
 });
}
