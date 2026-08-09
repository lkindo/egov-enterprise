'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { bannerService } from '@/services/business/user/BannerService';
import { Banner } from '@/types/foundation/banner';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { AttachmentImage } from '@/app/components/ui/attachment-image';

export function BannerSlider() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const data = await bannerService.getReflectedBanners();
        setBanners(data || []);
      } catch (error: unknown) {
        const err = error as { response?: { status?: number } };
        if (err.response?.status === 403) {
          console.warn('>>> [BannerSlider] Access denied (403). Banners will not be displayed for this user.');
        } else {
          console.error('>>> [BannerSlider] Failed to fetch banners:', error);
        }
        setBanners([]);
      } finally {
        setLoading(false);
      }
    };
    fetchBanners();
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

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
    <div className="relative group w-full h-48 md:h-64 overflow-hidden rounded-lg bg-surface-inverse shadow-lg">
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
            atchFileId={currentBanner.atchFileId}
            alt={currentBanner.bnrNm}
            className="h-full w-full object-cover transition-all duration-500 ease-in-out transform scale-105 group-hover:scale-100"
          />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent flex flex-col justify-center px-8 md:px-16 text-white">
        <h2 className="text-2xl md:text-3xl font-bold mb-2 animate-in slide-in-from-left duration-500">
          {currentBanner.bnrNm}
        </h2>
        <p className="text-sm md:text-base text-slate-200 mb-6 max-w-md animate-in slide-in-from-left delay-100 duration-500">
          {currentBanner.bnrExpln}
        </p>
        {/* linkUrl 은 관리자 자유입력값 — javascript:/data: 스킴 저장형 XSS 방지를 위해 http(s)만 앵커 렌더 */}
        {currentBanner.linkUrl && /^https?:\/\//i.test(currentBanner.linkUrl) && (
          <a
            href={currentBanner.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${currentBanner.bnrNm} 자세히 보기 새창 열림`}
            className="flex items-center gap-2 w-fit px-4 py-2 bg-white text-black rounded-lg font-bold hover:bg-primary hover:text-white transition-all text-sm"
          >
            자세히 보기 <ExternalLink size={14} />
          </a>
        )}
      </div>

      {banners.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            aria-label="이전 슬라이드"
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-black/30 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/50"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={nextSlide}
            aria-label="다음 슬라이드"
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-black/30 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/50"
          >
            <ChevronRight size={24} />
          </button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {banners.map((banner, idx) => (
              <button
                key={`banner-dot-${banner.bnrId || idx}`}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`${idx + 1}번 슬라이드로 이동`}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  idx === currentIndex ? "bg-white w-6" : "bg-white/40"
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
