'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Shield, Clock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

/**
 * ?몄뀡 留뚮즺 寃쎄퀬 而댄룷?뚰듃
 * 
 * JWT ?좏겙??留뚮즺 ?쒓컙??紐⑤땲?곕쭅?섏뿬, 留뚮즺 5遺??꾩뿉 
 * "?몄뀡???곗옣?섏떆寃좎뒿?덇퉴?" ?앹뾽???쒖떆?⑸땲??
 * 
 * - ?곗옣: ?좏겙 ?щ컻湲?reissue) API ?몄텧
 * - 臾댁떆: 留뚮즺 ???먮룞 濡쒓렇?꾩썐 諛?濡쒓렇???섏씠吏 ?대룞
 */
export function SessionExpiryWarning() {
  const { user, logout } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(300); // 5遺?= 300珥?  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const getTokenExpiry = useCallback((): number | null => {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem('accessToken');
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp ? payload.exp * 1000 : null; // ms 蹂??    } catch {
      return null;
    }
  }, []);

  const handleExtendSession = useCallback(async () => {
    try {
      // client.ts??reissue 濡쒖쭅??吏곸젒 ?몃━嫄?      const { default: client } = await import('@/lib/api/client');
      const res: any = await (client as any).post('/auth/reissue', {});
      
      if (res?.accessToken) {
        localStorage.setItem('accessToken', res.accessToken);
        document.cookie = `accessToken=${res.accessToken}; path=/; max-age=86400; SameSite=Lax`;
      }
    } catch {
      // reissue ?ㅽ뙣 ?쒖뿉??議곗슜??泥섎━ (?ъ슜?먭? ?묒뾽??怨꾩냽?????덈룄濡?
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

    const WARNING_THRESHOLD = 5 * 60 * 1000; // 留뚮즺 5遺???寃쎄퀬
    const CHECK_INTERVAL = 30 * 1000; // 30珥덈쭏??泥댄겕

    const checkExpiry = () => {
      const expiry = getTokenExpiry();
      if (!expiry) return;

      const now = Date.now();
      const timeLeft = expiry - now;

      if (timeLeft <= 0) {
        // ?대? 留뚮즺??        handleLogout();
      } else if (timeLeft <= WARNING_THRESHOLD && !showWarning) {
        // 5遺??대궡: 寃쎄퀬 ?쒖떆
        setRemainingSeconds(Math.floor(timeLeft / 1000));
        setShowWarning(true);
      }
    };

    // 二쇨린??泥댄겕
    timerRef.current = setInterval(checkExpiry, CHECK_INTERVAL);
    checkExpiry(); // 利됱떆 1???ㅽ뻾

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [user, getTokenExpiry, handleLogout, showWarning]);

  // 移댁슫?몃떎????대㉧
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
          {/* 諛곌꼍 ?ㅻ쾭?덉씠 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999]"
            onClick={() => setShowWarning(false)}
          />

          {/* 寃쎄퀬 ?앹뾽 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10000] w-full max-w-md"
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
              {/* ?ㅻ뜑 */}
              <div className="bg-amber-50 border-b border-amber-100 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Shield className="w-5 h-5 text-amber-600" />
                  </div>
                  <span className="font-black text-amber-800 text-sm">?몄뀡 留뚮즺 ?덉젙</span>
                </div>
                <button
                  onClick={() => setShowWarning(false)}
                  className="p-1 text-amber-400 hover:text-amber-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 蹂몃Ц */}
              <div className="p-8 text-center">
                <div className="inline-flex items-center gap-2 bg-rose-50 text-rose-600 px-4 py-2 rounded-full mb-6">
                  <Clock size={16} />
                  <span className="font-black text-lg tabular-nums">{formatTime(remainingSeconds)}</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">
                  ?몄뀡??怨?留뚮즺?⑸땲??                </h3>
                <p className="text-slate-500 font-medium text-sm leading-relaxed">
                  蹂댁븞???꾪빐 ?μ떆媛??쒕룞???놁쑝硫??먮룞?쇰줈 濡쒓렇?꾩썐?⑸땲??<br />
                  ?묒뾽??怨꾩냽?섏떆?ㅻ㈃ ?몄뀡???곗옣??二쇱꽭??
                </p>
              </div>

              {/* ?≪뀡 */}
              <div className="px-6 pb-6 flex gap-3">
                <button
                  onClick={handleLogout}
                  className="flex-1 px-4 py-3 border-2 border-slate-200 text-slate-500 font-black text-sm rounded-[0.1rem] hover:bg-slate-50 transition-colors"
                >
                  濡쒓렇?꾩썐
                </button>
                <button
                  onClick={handleExtendSession}
                  className="flex-1 px-4 py-3 bg-slate-900 text-white font-black text-sm rounded-[0.1rem] hover:bg-slate-800 shadow-xl transition active:scale-95"
                >
                  ?몄뀡 ?곗옣
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
