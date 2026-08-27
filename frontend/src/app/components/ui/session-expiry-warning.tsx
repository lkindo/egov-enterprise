'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Shield, Clock, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

/**
 * 세션 만료 경고 컴포넌트
 * 
 * JWT 토큰의 만료 시간을 모니터링하여, 만료 5분 전에 
 * "세션을 연장하시겠습니까?" 팝업을 표시합니다.
 * 
 * - 연장: 토큰 재발급(reissue) API 호출
 * - 무시: 만료 시 자동 로그아웃 및 로그인 페이지 이동
 */
/** 만료 몇 분 전부터 경고할지. 경고를 여는 조건이자, 연장 성공을 판정하는 기준이다. */
const WARNING_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * 연장 실패의 성격.
 * - `retryable`: 일시적 실패. 다시 시도가 의미 있다.
 * - `expired`: 세션 자체가 끝났다. 다시 시도는 눌러도 절대 성공하지 못하는 죽은 어포던스다.
 */
type ExtendFailure = 'retryable' | 'expired';

/** Route Handler 가 내려주는 실패 코드(SESSION_EXPIRED / REISSUE_RATE_LIMITED / REISSUE_PROXY_ERROR). */
function reissueFailureCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const response = (error as { response?: { data?: { code?: unknown } } }).response;
  const code = response?.data?.code;
  return typeof code === 'string' ? code : undefined;
}

export function SessionExpiryWarning() {
  const { user, logout } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(300); // 5분 = 300초
  /** 연장 실패의 성격. 실패를 조용히 삼키면 사용자가 만료를 모른 채 작업하다 튕긴다. */
  const [extendFailure, setExtendFailure] = useState<ExtendFailure | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const extendButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (showWarning) {
      const timeoutId = setTimeout(() => {
        extendButtonRef.current?.focus();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [showWarning]);

  const getTokenExpiry = useCallback((): number | null => {
    if (typeof window === 'undefined') return null;
    // accessToken 은 HttpOnly 라 JS 로 읽을 수 없다. 로그인/재발급 라우트가 심는
    // 비민감 만료힌트 쿠키(session_exp = exp ms)에서 만료시각만 읽는다.
    const m = document.cookie.match(/(?:^|;\s*)session_exp=([^;]+)/);
    if (!m) return null;
    const ms = parseInt(decodeURIComponent(m[1]), 10);
    return Number.isFinite(ms) ? ms : null;
  }, []);

  const handleExtendSession = useCallback(async () => {
    setExtendFailure(null);
    let failureCode: string | undefined;
    try {
      // ⚠ 반드시 authService.reissue()(= Next Route Handler '/api/auth/reissue')를 쓴다.
      //   종전에는 client.post('/auth/reissue') 였고, axios baseURL 이 브라우저에서 '/api/v1' 이라
      //   '/api/v1/auth/reissue' 로 나갔다. 이 경로는 next.config rewrite 로 백엔드에 그대로 전달되므로
      //   404 가 아니라 200 으로 "성공"했다 — 그래서 catch 도 타지 않았다.
      //   그러나 accessToken·session_exp 쿠키를 심는 주체는 Route Handler 뿐이라, 백엔드가 바디로
      //   돌려준 새 토큰은 버려지고 쿠키는 옛 만료시각 그대로 남았다. 결과적으로 팝업만 닫히고
      //   30초 뒤 재출현하는 무한 반복이었고, 더 나쁘게는 세션이 실제로 연장된 적이 없었다.
      // Route Handler 는 새 accessToken 과 session_exp 를 서버에서 쿠키로 재설정하므로
      // 클라이언트는 별도 저장이 불필요하다(토큰을 JS 로 저장하면 HttpOnly 전환이 무력화된다).
      const { authService } = await import('@/services/foundation/auth/authService');
      await authService.reissue();
    } catch (error) {
      // 여기서 곧장 실패로 단정하지 않는다 — 아래에서 결과로 판정한다.
      failureCode = reissueFailureCode(error);
    }

    // [판정 기준] "내 요청이 성공했는가"가 아니라 "세션이 실제로 연장됐는가"를 본다.
    //
    // 백엔드는 재발급 때 리프레시 토큰을 **회전**시킨다(같은 토큰 재사용은 401 — 2026-08-27 실측).
    // 그래서 axios 인터셉터의 자동 재발급과 이 버튼이 겹치면 늦게 도착한 쪽만 401 이 되는데,
    // 그 시점의 세션은 이미 연장돼 있다. 요청 성공 여부로 판정하면 **멀쩡한 세션을 두고
    // "다시 시도"만 반복하는 팝업**에 사용자가 갇힌다(실제 신고 증상).
    //
    // 동시에, 200 을 받았다는 것도 연장의 증거가 아니다 — 과거 회귀가 정확히 그 틈이었다
    // (200 인데 쿠키는 옛 만료시각 그대로). 결과로만 판정하면 두 방향이 함께 막힌다.
    const expiry = getTokenExpiry();
    if (expiry !== null && expiry - Date.now() > WARNING_THRESHOLD_MS) {
      setShowWarning(false);
      return;
    }

    // 연장되지 않았다. 경고를 닫으면 사용자가 만료를 모른 채 작업하다 튕기므로 유지하되,
    // 재시도가 의미 있는 실패인지 아닌지는 구분해서 알린다.
    setExtendFailure(failureCode === 'SESSION_EXPIRED' ? 'expired' : 'retryable');
  }, [getTokenExpiry]);

  const handleLogout = useCallback(async () => {
    setShowWarning(false);
    await logout();
    window.location.href = '/login?expired=true';
  }, [logout]);

  useEffect(() => {
    if (!user) {
      setShowWarning(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      return;
    }

    const CHECK_INTERVAL = 30 * 1000; // 30초마다 체크

    const checkExpiry = () => {
      const expiry = getTokenExpiry();
      if (!expiry) return;

      const now = Date.now();
      const timeLeft = expiry - now;

      if (timeLeft <= 0) {
        // 이미 만료됨
        handleLogout();
      } else if (timeLeft <= WARNING_THRESHOLD_MS && !showWarning) {
        // 5분 이내: 경고 표시
        setRemainingSeconds(Math.floor(timeLeft / 1000));
        setExtendFailure(null);
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
    <Dialog open={showWarning} onOpenChange={(open) => { if (!open) setShowWarning(false); }}>
      <DialogContent showCloseButton={false} className="max-w-md p-0 overflow-hidden border-border bg-card">
        {/* 접근성을 위한 sr-only 제목 및 설명 */}
        <DialogTitle className="sr-only">세션 만료 경고</DialogTitle>
        <DialogDescription className="sr-only">보안을 위해 장시간 활동이 없으면 자동으로 로그아웃됩니다.</DialogDescription>

        <div className="bg-card rounded-lg border border-border overflow-hidden">
          {/* 헤더 */}
          <div className="bg-amber-50 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-900/20 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="font-bold text-amber-800 dark:text-amber-400 text-sm">세션 만료 예정</span>
            </div>
            <button
              onClick={() => setShowWarning(false)}
              aria-label="세션 경고 닫기"
              className="p-1 text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* 본문 */}
          <div className="p-8 text-center">
            <div
              className="inline-flex items-center gap-2 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 px-4 py-2 rounded-lg mb-6"
            >
              <Clock size={16} />
              {/* 매초 낭독(verbose) 방지: 시각 카운트다운은 aria-hidden, 경고 자체는 dialog role로 1회 고지 */}
              <span aria-hidden="true" className="font-bold text-lg tabular-nums">{formatTime(remainingSeconds)}</span>
            </div>
            <h3 className="text-xl font-bold text-card-foreground mb-2">
              세션이 곧 만료됩니다
            </h3>
            <p className="text-muted-foreground font-medium text-sm leading-relaxed">
              보안을 위해 장시간 활동이 없으면 자동으로 로그아웃됩니다.<br />
              작업을 계속하시려면 세션을 연장해 주세요.
            </p>
            {extendFailure === 'retryable' && (
              <p role="alert" className="mt-4 text-sm font-bold text-destructive-emphasis">
                세션 연장에 실패했습니다. 다시 시도하거나, 작업을 저장한 뒤 다시 로그인해 주세요.
              </p>
            )}
            {extendFailure === 'expired' && (
              <p role="alert" className="mt-4 text-sm font-bold text-destructive-emphasis">
                세션이 만료되었습니다. 연장할 수 없으니 작업을 저장한 뒤 다시 로그인해 주세요.
              </p>
            )}
          </div>

          {/* 액션 — 세션이 끝난 뒤에는 '다시 시도'를 남겨 두지 않는다. 눌러도 성공할 수 없다. */}
          <div className="px-6 pb-6 flex gap-3">
            {extendFailure === 'expired' ? (
              <button
                ref={extendButtonRef}
                onClick={handleLogout}
                className="flex-1 px-4 py-3 bg-primary text-primary-foreground font-bold text-sm rounded-lg hover:bg-primary/90 shadow-xl transition-all active:scale-95 cursor-pointer"
              >
                다시 로그인
              </button>
            ) : (
              <>
                <button
                  onClick={handleLogout}
                  className="flex-1 px-4 py-3 border-2 border-border text-muted-foreground font-bold text-sm rounded-lg hover:bg-accent transition-colors cursor-pointer"
                >
                  로그아웃
                </button>
                <button
                  ref={extendButtonRef}
                  onClick={handleExtendSession}
                  className="flex-1 px-4 py-3 bg-primary text-primary-foreground font-bold text-sm rounded-lg hover:bg-primary/90 shadow-xl transition-all active:scale-95 cursor-pointer"
                >
                  {extendFailure === 'retryable' ? '다시 시도' : '세션 연장'}
                </button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
