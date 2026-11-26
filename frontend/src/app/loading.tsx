import { SITE_IDENTITY } from '@/config/site-identity';
import { CommonText } from './components/layout/ShellText';
import { contentLang } from '@/i18n/content-lang';

export default function GlobalLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md transition-all duration-500"
    >
      <div className="relative">
        {/* Animated Rings */}
        <div className="w-24 h-24 border-4 border-primary/20 rounded-full animate-pulse" />
        <div className="absolute top-0 left-0 w-24 h-24 border-4 border-primary border-t-transparent rounded-full animate-spin duration-700" />

        {/* Center Logo/Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/40 rotate-12 animate-bounce">
            <span lang={contentLang(SITE_IDENTITY.logoMark)} className="text-primary-foreground font-bold text-sm">{SITE_IDENTITY.logoMark}</span>
          </div>
        </div>
      </div>

      {/* Loading Text */}
      <div className="mt-8 flex flex-col items-center gap-2">
        {/* [2026-11-26 ADR-0063] 글자는 카탈로그(common)에서 지금 화면의 로케일로 그린다. */}
        <h1 className="text-xl font-bold tracking-tighter text-primary"><CommonText k="globalLoadingTitle" /></h1>
        <span className="sr-only"><CommonText k="globalLoadingAnnouncement" values={{ site: SITE_IDENTITY.siteAccessibleName }} /></span>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-[bounce_1s_infinite_0ms]" />
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-[bounce_1s_infinite_200ms]" />
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-[bounce_1s_infinite_400ms]" />
        </div>
        <p className="text-xs font-bold text-muted-foreground tracking-[0.2em] mt-2 opacity-70">
          <CommonText k="globalLoadingStatus" />
        </p>
      </div>

      {/* Background Accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-lg blur-[120px] -z-10" />
    </div>
  );
}
