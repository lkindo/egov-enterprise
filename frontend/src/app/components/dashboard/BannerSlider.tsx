'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Pause, Play } from 'lucide-react';
import { bannerService } from '@/services/business/user/BannerService';
import { isCanceledRequest } from '@/lib/safe-error-log';
import { Banner } from '@/types/foundation/banner';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { AttachmentImage } from '@/app/components/ui/attachment-image';

export function BannerSlider() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  // [2026-09-24] 자동 넘김은 사용자가 멈출 수 있어야 한다(WCAG 2.2.2). WAI-ARIA 캐러셀 패턴을 따라
  //   멈춤 버튼 외에 마우스가 올라가 있거나 키보드 포커스가 안에 있는 동안에도 넘기지 않는다 —
  //   점이나 이전·다음 버튼을 고르는 사이에 슬라이드가 바뀌면 누른 대상이 사라진다.
  const [rotationStopped, setRotationStopped] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const rotating = banners.length > 1 && !rotationStopped && !hovered && !focusWithin;

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const data = await bannerService.getReflectedBanners();
        setBanners(data || []);
      } catch (error: unknown) {
        // [2026-09-16] 취소는 실패가 아니다 — 인증 상태가 바뀌어 이전 요청 결과를 버린 것이다.
        //   콘솔 오류로 남기면 e2e 오류 감지기가 진짜 오류와 섞어 세고, 재시도로 통과해도 flaky 가 된다.
        if (!isCanceledRequest(error)) {
          const err = error as { response?: { status?: number } };
          if (err.response?.status === 403) {
            console.warn('>>> [BannerSlider] Access denied (403). Banners will not be displayed for this user.');
          } else {
            console.error('>>> [BannerSlider] Failed to fetch banners:', error);
          }
        }
        setBanners([]);
      } finally {
        setLoading(false);
      }
    };
    fetchBanners();
  }, []);

  useEffect(() => {
    if (!rotating) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [rotating, banners.length]);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? banners.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  if (loading) {
    return <div className="w-full h-48 md:h-64 bg-muted animate-pulse rounded-lg" />;
  }

  if (banners.length === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex];
  // 외부 URL(http/https)은 그대로 렌더한다. 그 외에는 첨부이므로 blob 으로 받아 그린다 —
  // `<img src="/api/v1/files/…">` 는 Authorization 헤더를 실을 수 없어 원리적으로 401 이다.
  // (종전 코드는 백엔드에 존재하지도 않는 `/api/v1/files/download?fileId=` 를 불렀다.)
  const externalUrl = currentBanner.bnrImgNm?.startsWith('http') ? currentBanner.bnrImgNm : null;

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="홍보 배너"
      className="relative group w-full h-48 md:h-64 overflow-hidden rounded-lg bg-surface-inverse shadow-lg"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocusWithin(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusWithin(false);
      }}
    >
      {externalUrl ? (
        <Image
          src={externalUrl}
          alt={currentBanner.bnrNm}
          fill
          sizes="100vw"
          className="object-cover transition-all duration-500 ease-in-out transform scale-105 group-hover:scale-100"
          style={{ opacity: 0.8 }}
          priority
        />
      ) : (
        <div className="absolute inset-0" style={{ opacity: 0.8 }}>
          <AttachmentImage
            atchFileSn={currentBanner.atchFileSn}
            alt={currentBanner.bnrNm}
            className="h-full w-full object-cover transition-all duration-500 ease-in-out transform scale-105 group-hover:scale-100"
          />
        </div>
      )}

      <div
        aria-live={rotating ? 'off' : 'polite'}
        className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent flex flex-col justify-center px-8 md:px-16 text-white"
      >
        <h2 className="text-2xl md:text-3xl font-bold mb-2 animate-in slide-in-from-left duration-500">
          {currentBanner.bnrNm}
        </h2>
        <p className="text-sm md:text-base text-white/80 mb-6 max-w-md animate-in slide-in-from-left delay-100 duration-500">
          {currentBanner.bnrExpln}
        </p>
        {/* linkUrl 은 관리자 자유입력값 — javascript:/data: 스킴 저장형 XSS 방지를 위해 http(s)만 앵커 렌더 */}
        {currentBanner.linkUrl && /^https?:\/\//i.test(currentBanner.linkUrl) && (
          <a
            href={currentBanner.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${currentBanner.bnrNm} 자세히 보기 새창 열림`}
            className="flex items-center gap-2 w-fit px-4 py-2 bg-card text-foreground rounded-lg font-bold hover:bg-primary hover:text-white transition-all text-sm"
          >
            자세히 보기 <ExternalLink size={14} />
          </a>
        )}
      </div>

      {banners.length > 1 && (
        <>
          {/* 평소에는 숨기되 키보드 포커스가 오면 보인다 — 보이지 않는 곳에 포커스가 가면 안 된다(WCAG 2.4.7). */}
          <button
            type="button"
            onClick={prevSlide}
            aria-label="이전 슬라이드"
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-black/30 text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity hover:bg-black/50"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            type="button"
            onClick={nextSlide}
            aria-label="다음 슬라이드"
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-black/30 text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity hover:bg-black/50"
          >
            <ChevronRight size={24} />
          </button>

          {/* 점은 8px 로 보이되 누르는 영역은 24px 다(WCAG 2.5.8). 종전에는 누르는 영역도 8px 이었고
              점 중심 간격이 16px 라 간격 예외도 성립하지 않았다. 시각 위치는 종전과 같다. */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex">
            {banners.map((banner, idx) => (
              <button
                key={`banner-dot-${banner.bnrSn || idx}`}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                aria-label={`${idx + 1}번 슬라이드로 이동`}
                aria-current={idx === currentIndex ? 'true' : undefined}
                className="flex h-6 min-w-6 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-2 w-2 rounded-full transition-all",
                    idx === currentIndex ? "bg-surface-inverse-foreground w-6" : "bg-white/40"
                  )}
                />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setRotationStopped((stopped) => !stopped)}
            aria-label={rotationStopped ? '자동 넘김 시작' : '자동 넘김 멈춤'}
            className="absolute bottom-2 right-4 rounded-md bg-black/30 p-1.5 text-white transition-colors hover:bg-black/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {rotationStopped ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
          </button>
        </>
      )}
    </div>
  );
}
