
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authService, UserInfo } from '@/services/foundation/auth/authService';

interface AuthContextType {
  user: UserInfo | null;
  loading: boolean;
  login: (credentials: Record<string, string>) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    // ?좏겙님?놁쑝硫님몄쬆 확인님嫄대꼫?곷땲님
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    // ?좏겙님留뚮즺?섏뿀?붾씪님interceptor ?먯꽌 reissue 瑜님쒕룄님寃껋씠誘濡    // /auth/me 瑜님몄텧?섏뿬 理쒖쥌 ?좏슚?깆쓣 寃利앺빀?덈떎.
    try {
      const userData = await authService.getCurrentUser();
      if (userData) {
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch {
      // 401 ?먮윭님interceptor 媛 ?좏겙 щ컻湲님ㅽ뙣 님理쒖쥌?곸쑝濡님섏쭛?덈떎.
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (credentials: Record<string, string>) => {
    try {
      // 諛깆뿏님湲곕? ?꾨뱶紐蹂님 id 님userId
      const loginData = {
        userId: credentials.id,
        password: credentials.password,
      };
      const data = await authService.login(loginData);

      if (data && data.accessToken) {
        // 1. localStorage 님님(?곗꽑)
        localStorage.setItem('accessToken', data.accessToken);

        // 2. 荑좏궎님님(middleware 및 SSR 님
        document.cookie = `accessToken=${data.accessToken}; path=/; max-age=86400; SameSite=Lax`;
        if (data.role) {
          document.cookie = `userRole=${data.role}; path=/; max-age=86400; SameSite=Lax`;
        }

        // 3. ?꾩뿭 ?곹깭 ?낅뜲?댄듃 (利됱떆 諛섏쁺)
        const userData = await authService.getCurrentUser();
        setUser(userData);

        // 4. ?붾쾭源 님확인
        if (process.env.NODE_ENV === 'development') {
          console.log('[AuthContext] Login successful, user set to:', userData);
          console.log('[AuthContext] Cookies set:', document.cookie);
          console.log('[AuthContext] localStorage:', localStorage.getItem('accessToken'));
        }
      } else {
        throw new Error('?몄쬆 ?뺣낫媛 щ컮瑜댁? ?딆뒿?덈떎.');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '로그인以님ㅻ쪟媛 諛쒖깮있습니다.';
      console.error('Login process error:', message);
      throw new Error(message);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      console.error('Logout API call failed', error);
    } finally {
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

