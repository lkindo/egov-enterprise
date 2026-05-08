'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Shield, Clock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

/**
 * 세션 만료 경고 컴포넌트
 * 
 * JWT 토큰의 만료 시간을 모니터링하여, 만료 5분 전에 
 * "세션을 연장하시겠습니까?" 팝업을 표시합니다.
 * 
 * - 연장: 토큰 재발급(reissue) API 호출
 * - 무시: 만료 시 자동 로그아웃 및 로그인 페이지 이동
 */
export function SessionExpiryWarning() {
  const { user, logout } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(300); // 5분 = 300초
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const getTokenExpiry = useCallback((): number | null => {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem('accessToken');
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp ? payload.exp * 1000 : null; // ms 변환
    } catch {
      return null;
    }
  }, []);

  const handleExtendSession = useCallback(async () => {
    try {
      // client.ts의 reissue 로직을 직접 트리거
      const { default: client } = await import('@/lib/api/client');
      const res: any = await (client as any).post('/auth/reissue', {});
      
      if (res?.accessToken) {
        localStorage.setItem('accessToken', res.accessToken);
        document.cookie = `accessToken=${res.accessToken}; path=/; max-age=86400; SameSite=Lax`;
      }
    } catch {
      // reissue 실패 시에도 조용히 처리 (사용자가 작업을 계속할 수 있도록)
    }
    setShowWarning(false);
  }, []);

  const handleLogout = useCallback(async () => {
    setShowWarning(false);
    await logout();
    window.location.href = '/login?expired=true';
  }, [logout]);

  useEffect(() => {
    if (!user) return;

    const WARNING_THRESHOLD = 5 * 60 * 1000; // 만료 5분 전 경고
    const CHECK_INTERVAL = 30 * 1000; // 30초마다 체크

    const checkExpiry = () => {
      const expiry = getTokenExpiry();
      if (!expiry) return;

      const now = Date.now();
      const timeLeft = expiry - now;

      if (timeLeft <= 0) {
        // 이미 만료됨
        handleLogout();
      } else if (timeLeft <= WARNING_THRESHOLD && !showWarning) {
        // 5분 이내: 경고 표시
        setRemainingSeconds(Math.floor(timeLeft / 1000));
        setShowWarning(true);
      }
    };

    // 주기적 체크
    timerRef.current = setInterval(checkExpiry, CHECK_INTERVAL);
    checkExpiry(); // 즉시 1회 실행

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [user, getTokenExpiry, handleLogout, showWarning]);

  // 카운트다운 타이머
  useEffect(() => {
    if (!showWarning) {
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }

    countdownRef.current = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          handleLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [showWarning, handleLogout]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      {showWarning && (
        <>
          {/* 배경 오버레이 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999]"
            onClick={() => setShowWarning(false)}
          />

          {/* 경고 팝업 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10000] w-full max-w-md"
          >
            <div className="bg-white rounded-lg shadow-2xl border border-slate-200 overflow-hidden">
              {/* 헤더 */}
              <div className="bg-amber-50 border-b border-amber-100 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Shield className="w-5 h-5 text-amber-600" />
                  </div>
                  <span className="font-bold text-amber-800 text-sm">세션 만료 예정</span>
                </div>
                <button
                  onClick={() => setShowWarning(false)}
                  className="p-1 text-amber-400 hover:text-amber-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 본문 */}
              <div className="p-8 text-center">
                <div className="inline-flex items-center gap-2 bg-rose-50 text-rose-600 px-4 py-2 rounded-full mb-6">
                  <Clock size={16} />
                  <span className="font-bold text-lg tabular-nums">{formatTime(remainingSeconds)}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  세션이 곧 만료됩니다
                </h3>
                <p className="text-slate-500 font-medium text-sm leading-relaxed">
                  보안을 위해 장시간 활동이 없으면 자동으로 로그아웃됩니다.<br />
                  작업을 계속하시려면 세션을 연장해 주세요.
                </p>
              </div>

              {/* 액션 */}
              <div className="px-6 pb-6 flex gap-3">
                <button
                  onClick={handleLogout}
                  className="flex-1 px-4 py-3 border-2 border-slate-200 text-slate-500 font-bold text-sm rounded-lg hover:bg-slate-50 transition-colors"
                >
                  로그아웃
                </button>
                <button
                  onClick={handleExtendSession}
                  className="flex-1 px-4 py-3 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 shadow-xl transition-all active:scale-95"
                >
                  세션 연장
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
