'use client';

import { AlertTriangle, RefreshCcw, Home, ArrowLeft, Bug, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

function statusFrom(value: unknown): number | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const directStatus = record.status ?? record.statusCode;
  if (typeof directStatus === 'number') return directStatus;

  return statusFrom(record.response) ?? statusFrom(record.cause);
}

/**
 * Next.js App Router 에러 바운더리 (admin 레이아웃 전용)
 * 
 * SSR/CSR 모두에서 발생하는 미처리 에러를 사용자 친화적으로 처리합니다.
 * - 401: 세션 만료 → 로그인 리다이렉트 안내
 * - 403: 권한 부족 → 접근 제한 안내
 * - 404: 리소스 없음 → 이전 페이지 유도
 * - 500+: 시스템 오류 → 재시도 및 문의 안내
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const handleReset = () => {
    reset();
  };

  // 에러 메시지 및 구조화된 프로퍼티에서 HTTP 상태 코드 추출
  const statusCode = statusFrom(error);
  const is401 = statusCode === 401 || error.message?.includes('401');
  const is403 = statusCode === 403 || error.message?.includes('403') || error.message?.includes('Forbidden');
  const is404 = statusCode === 404 || error.message?.includes('404') || error.message?.includes('Not Found');

  // 에러 유형별 UI 분기
  if (is401) {
    return (
      <ErrorLayout
        icon={<Shield className="w-12 h-12" />}
        iconColor="text-amber-500"
        iconBg="bg-amber-500/10"
        title="세션이 만료되었습니다"
        description="보안을 위해 일정 시간 동안 활동이 없으면 자동으로 로그아웃됩니다. 다시 로그인하여 이어서 작업하세요."
        actions={
          <>
            <ActionButton
              primary
              icon={<Shield size={18} />}
              label="로그인"
              onClick={() => {
                window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
              }}
            />
            <ActionButton icon={<Home size={18} />} label="메인으로" href="/" />
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
        title="접근 권한이 없습니다"
        description="이 페이지에 접근할 수 있는 권한이 부여되지 않았습니다. 관리자에게 권한 요청을 하시거나, 다른 메뉴를 이용해 주세요."
        actions={
          <>
            <ActionButton primary icon={<ArrowLeft size={18} />} label="이전으로" onClick={() => window.history.back()} />
            <ActionButton icon={<Home size={18} />} label="메인으로" href="/admin/work-hub" />
          </>
        }
      />
    );
  }

  if (is404) {
    return (
      <ErrorLayout
        icon={<Bug className="w-12 h-12" />}
        iconColor="text-muted-foreground"
        iconBg="bg-muted"
        title="페이지를 찾을 수 없습니다"
        description="요청하신 페이지가 존재하지 않거나, 주소가 변경되었을 수 있습니다. URL을 다시 확인하시거나 이전 페이지로 돌아가 주세요."
        actions={
          <>
            <ActionButton primary icon={<ArrowLeft size={18} />} label="이전으로" onClick={() => window.history.back()} />
            <ActionButton icon={<Home size={18} />} label="메인으로" href="/admin/work-hub" />
          </>
        }
      />
    );
  }

  // 기본: 시스템 오류 (500 등)
  return (
    <ErrorLayout
      icon={<AlertTriangle className="w-12 h-12" />}
      iconColor="text-rose-500"
      iconBg="bg-rose-500/10"
      title="일시적인 오류가 발생했습니다"
      description="서버와의 통신 중 문제가 발생했습니다. 잠시 후 다시 시도하시거나, 문제가 지속되면 관리자에게 문의해 주세요."
      actions={
        <>
          <ActionButton primary icon={<RefreshCcw size={18} />} label="다시 시도" onClick={handleReset} />
          <ActionButton icon={<Home size={18} />} label="메인으로" href="/admin/work-hub" />
        </>
      }
    />
  );
}

/* ── 공통 레이아웃 ── */

function ErrorLayout({
  icon,
  iconColor,
  iconBg,
  title,
  description,
  actions,
}: {
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  actions: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col items-center text-center max-w-lg"
      >
        <div className={`p-6 rounded-lg ${iconBg} ${iconColor} mb-6`}>{icon}</div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight mb-3">{title}</h1>
        <p className="text-muted-foreground font-medium leading-relaxed mb-8">{description}</p>
        <div className="flex items-center gap-3">{actions}</div>
      </motion.div>
    </div>
  );
}

function ActionButton({
  primary,
  icon,
  label,
  onClick,
  href,
}: {
  primary?: boolean;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  href?: string;
}) {
  const className = `flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all active:scale-95 ${
    primary
      ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl'
      : 'border-2 border-border text-muted-foreground hover:bg-accent'
  }`;
  const content = (
    <>
      <span aria-hidden="true">{icon}</span>
      {label}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button
      onClick={onClick}
      className={className}
    >
      {content}
    </button>
  );
}
