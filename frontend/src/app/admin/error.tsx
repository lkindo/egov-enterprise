'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCcw, Home, ArrowLeft, Bug, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Next.js App Router ?먮윭 諛붿슫?붾━ (admin ?덉씠?꾩썐 ?꾩슜)
 * 
 * SSR/CSR 紐⑤몢?먯꽌 諛쒖깮?섎뒗 誘몄쿂由??먮윭瑜??ъ슜??移쒗솕?곸쑝濡?泥섎━?⑸땲??
 * - 401: ?몄뀡 留뚮즺 ??濡쒓렇??由щ떎?대젆???덈궡
 * - 403: 沅뚰븳 遺議????묎렐 ?쒗븳 ?덈궡
 * - 404: 由ъ냼???놁쓬 ???댁쟾 ?섏씠吏 ?좊룄
 * - 500+: ?쒖뒪???ㅻ쪟 ???ъ떆??諛?臾몄쓽 ?덈궡
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // ?꾨줈?뺤뀡 ?섍꼍?먯꽌???먮윭 由ы룷???쒕퉬?ㅻ줈 ?꾩넚
    console.error('[AdminErrorBoundary]', error);
  }, [error]);

  // ?먮윭 硫붿떆吏?먯꽌 HTTP ?곹깭 肄붾뱶 異붿텧
  const is401 = error.message?.includes('401');
  const is403 = error.message?.includes('403') || error.message?.includes('Forbidden');
  const is404 = error.message?.includes('404') || error.message?.includes('Not Found');

  // ?먮윭 ?좏삎蹂?UI 遺꾧린
  if (is401) {
    return (
      <ErrorLayout
        icon={<Shield className="w-12 h-12" />}
        iconColor="text-amber-500"
        iconBg="bg-amber-500/10"
        title="?몄뀡??留뚮즺?섏뿀?듬땲??
        description="蹂댁븞???꾪빐 ?쇱젙 ?쒓컙 ?숈븞 ?쒕룞???놁쑝硫??먮룞?쇰줈 濡쒓렇?꾩썐?⑸땲?? ?ㅼ떆 濡쒓렇?명븯???댁뼱???묒뾽?섏꽭??"
        actions={
          <>
            <ActionButton
              primary
              icon={<Shield size={18} />}
              label="濡쒓렇??
              onClick={() => {
                window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
              }}
            />
            <ActionButton icon={<Home size={18} />} label="硫붿씤?쇰줈" onClick={() => (window.location.href = '/')} />
          </>
        }
      />
    );
  }

  if (is403) {
    return (
      <ErrorLayout
        icon={<Shield className="w-12 h-12" />}
        iconColor="text-red-500"
        iconBg="bg-red-500/10"
        title="?묎렐 沅뚰븳???놁뒿?덈떎"
        description="???섏씠吏???묎렐?????덈뒗 沅뚰븳??遺?щ릺吏 ?딆븯?듬땲?? 愿由ъ옄?먭쾶 沅뚰븳 ?붿껌???섏떆嫄곕굹, ?ㅻⅨ 硫붾돱瑜??댁슜??二쇱꽭??"
        actions={
          <>
            <ActionButton primary icon={<ArrowLeft size={18} />} label="?댁쟾?쇰줈" onClick={() => window.history.back()} />
            <ActionButton icon={<Home size={18} />} label="硫붿씤?쇰줈" onClick={() => (window.location.href = '/admin')} />
          </>
        }
      />
    );
  }

  if (is404) {
    return (
      <ErrorLayout
        icon={<Bug className="w-12 h-12" />}
        iconColor="text-slate-400"
        iconBg="bg-slate-100"
        title="?섏씠吏瑜?李얠쓣 ???놁뒿?덈떎"
        description="?붿껌?섏떊 ?섏씠吏媛 議댁옱?섏? ?딄굅?? 二쇱냼媛 蹂寃쎈릺?덉쓣 ???덉뒿?덈떎. URL???ㅼ떆 ?뺤씤?섏떆嫄곕굹 ?댁쟾 ?섏씠吏濡??뚯븘媛 二쇱꽭??"
        actions={
          <>
            <ActionButton primary icon={<ArrowLeft size={18} />} label="?댁쟾?쇰줈" onClick={() => window.history.back()} />
            <ActionButton icon={<Home size={18} />} label="硫붿씤?쇰줈" onClick={() => (window.location.href = '/admin')} />
          </>
        }
      />
    );
  }

  // 湲곕낯: ?쒖뒪???ㅻ쪟 (500 ??
  return (
    <ErrorLayout
      icon={<AlertTriangle className="w-12 h-12" />}
      iconColor="text-rose-500"
      iconBg="bg-rose-500/10"
      title="?쇱떆?곸씤 ?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎"
      description="?쒕쾭????듭떊 以?臾몄젣媛 諛쒖깮?덉뒿?덈떎. ?좎떆 ???ㅼ떆 ?쒕룄?섏떆嫄곕굹, 臾몄젣媛 吏?띾릺硫?愿由ъ옄?먭쾶 臾몄쓽??二쇱꽭??"
      actions={
        <>
          <ActionButton primary icon={<RefreshCcw size={18} />} label="?ㅼ떆 ?쒕룄" onClick={reset} />
          <ActionButton icon={<Home size={18} />} label="硫붿씤?쇰줈" onClick={() => (window.location.href = '/admin')} />
        </>
      }
      digest={error.digest}
    />
  );
}

/* ?? 怨듯넻 ?덉씠?꾩썐 ?? */

function ErrorLayout({
  icon,
  iconColor,
  iconBg,
  title,
  description,
  actions,
  digest,
}: {
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  actions: React.ReactNode;
  digest?: string;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col items-center text-center max-w-lg"
      >
        <div className={`p-6 rounded-2xl ${iconBg} ${iconColor} mb-6`}>{icon}</div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-3">{title}</h2>
        <p className="text-slate-500 font-medium leading-relaxed mb-8">{description}</p>
        <div className="flex items-center gap-3">{actions}</div>
        {digest && (
          <p className="mt-8 text-xs text-slate-300 font-mono">
            李몄“ 肄붾뱶: {digest}
          </p>
        )}
      </motion.div>
    </div>
  );
}

function ActionButton({
  primary,
  icon,
  label,
  onClick,
}: {
  primary?: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-3 rounded-[0.1rem] font-black text-sm transition active:scale-95 ${
        primary
          ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-xl'
          : 'border-2 border-slate-200 text-slate-600 hover:bg-slate-50'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
