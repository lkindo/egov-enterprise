import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 홍보 배너 '자세히 보기' 링크(2026-10-26 ADR-0042).
 *
 * linkUrl 은 관리자 자유입력값이다. 사이트 안 경로(/pages/… 등)는 같은 창으로, http(s) 바깥 주소는 새 창으로 열고,
 * 그 밖의 값(javascript:·data:·'//다른 사이트' 등)은 링크로 그리지 않는다. 종전에는 http(s) 만 그려, 안내 페이지로
 * 보내는 배너를 만들어도 링크가 보이지 않았다.
 */
const harness = vi.hoisted(() => ({ banners: vi.fn(), attachment: vi.fn() }));

vi.mock('@/services/business/user/BannerService', () => ({
  bannerService: { getReflectedBanners: harness.banners },
}));
vi.mock('@/app/components/ui/attachment-image', () => ({
  AttachmentImage: ({ atchFileSn, alt }: { atchFileSn?: number | null; alt: string }) => {
    harness.attachment({ atchFileSn, alt });
    return <span role="img" aria-label={alt} data-testid="attachment-banner-image" data-attachment-id={atchFileSn ?? ''} />;
  },
}));
// remotePatterns=[] and the image CSP do not support external banner images.
// Keep this sentinel so a restored external branch fails without bypassing the production loader policy.
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <span role="img" aria-label={alt} data-testid="legacy-banner-image" data-src={src} />
  ),
}));

import { BannerSlider } from '../BannerSlider';

function banner(linkUrl: string) {
  return { bnrSn: 1, bnrNm: '안내 배너', linkUrl, bnrImgNm: '', bnrExpln: '설명' };
}

async function renderWith(linkUrl: string) {
  harness.banners.mockResolvedValue([banner(linkUrl)]);
  render(<BannerSlider />);
  await screen.findByRole('heading', { name: '안내 배너' });
}

describe('홍보 배너 자세히 보기 링크', () => {
  beforeEach(() => {
    harness.banners.mockReset();
    harness.attachment.mockClear();
  });

  it('사이트 안 경로는 같은 창 링크로 그린다', async () => {
    await renderWith('/pages/guide?tab=1#top');

    const link = screen.getByRole('link', { name: '안내 배너 자세히 보기' });
    expect(link).toHaveAttribute('href', '/pages/guide?tab=1#top');
    expect(link).not.toHaveAttribute('target');
    expect(link).not.toHaveAttribute('rel');
  });

  it('바깥 http(s) 주소는 종전처럼 새 창으로 연다', async () => {
    await renderWith('https://www.example.go.kr/notice');

    const link = screen.getByRole('link', { name: '안내 배너 자세히 보기 새창 열림' });
    expect(link).toHaveAttribute('href', 'https://www.example.go.kr/notice');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it.each([
    ['javascript 스킴', 'javascript:alert(1)'],
    ['data 스킴', 'data:text/html,<script>alert(1)</script>'],
    ['대소문자를 섞은 javascript 스킴', 'JavaScript:alert(1)'],
    ['다른 사이트로 읽히는 //', '//evil.example.com/pages'],
    ['다른 사이트로 읽히는 /\\', '/\\evil.example.com'],
    ['브라우저가 지우는 탭이 낀 경로', '/\t/evil.example.com'],
    ['역슬래시가 낀 경로', '/pages\\..\\evil'],
    ['상대 경로', 'pages/guide'],
  ])('%s 는 링크로 그리지 않는다', async (_label, linkUrl) => {
    await renderWith(linkUrl);

    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByText('자세히 보기')).toBeNull();
  });

  it('링크가 비어 있으면 그리지 않는다', async () => {
    await renderWith('');

    expect(screen.queryByRole('link')).toBeNull();
  });

  it.each(['http-banner.png', 'https-guide.jpg', 'https://legacy.example/banner.png'])(
    '첨부 ID가 있으면 파일명 %s보다 첨부 이미지가 우선한다', async (bnrImgNm) => {
      harness.banners.mockResolvedValue([{ ...banner(''), atchFileSn: 42, bnrImgNm }]);
      render(<BannerSlider />);
      await screen.findByRole('heading', { name: '안내 배너' });

      expect(screen.getByTestId('attachment-banner-image')).toHaveAttribute('data-attachment-id', '42');
      expect(screen.getByRole('img', { name: '안내 배너' })).toBeVisible();
      expect(screen.queryByTestId('legacy-banner-image')).toBeNull();
    },
  );

  it.each(['http://legacy.example/banner.png', 'https://legacy.example/banner.png', 'HTTPS://legacy.example/banner.png'])(
    '첨부 없는 과거 절대 URL %s는 외부 요청 대신 빈 첨부 이미지로 표시한다', async (bnrImgNm) => {
      harness.banners.mockResolvedValue([{ ...banner(''), atchFileSn: null, bnrImgNm }]);
      render(<BannerSlider />);
      await screen.findByRole('heading', { name: '안내 배너' });

      expect(screen.getByTestId('attachment-banner-image')).toHaveAttribute('data-attachment-id', '');
      expect(harness.attachment).toHaveBeenLastCalledWith({ atchFileSn: null, alt: '안내 배너' });
      expect(screen.getByRole('img', { name: '안내 배너' })).toBeVisible();
      expect(screen.queryByTestId('legacy-banner-image')).toBeNull();
    },
  );

  it.each([undefined, null, 0, -1, 1.5])('유효하지 않은 첨부 ID %s는 null로 전달해 빈 이미지로 표시한다', async (atchFileSn) => {
    harness.banners.mockResolvedValue([{ ...banner(''), atchFileSn }]);
    render(<BannerSlider />);
    await screen.findByRole('heading', { name: '안내 배너' });

    expect(harness.attachment).toHaveBeenLastCalledWith({ atchFileSn: null, alt: '안내 배너' });
    expect(screen.getByTestId('attachment-banner-image')).toHaveAttribute('data-attachment-id', '');
    expect(screen.queryByTestId('legacy-banner-image')).toBeNull();
  });

  it.each([
    'http-banner.png', 'https-guide.jpg', 'httpx://legacy.example/banner.png',
    'http:banner.png', 'https://', '//evil.example/banner.png', 'javascript:alert(1)',
  ])('첨부가 없어도 %s를 외부 이미지 URL로 오인하지 않는다', async (bnrImgNm) => {
    harness.banners.mockResolvedValue([{ ...banner(''), atchFileSn: null, bnrImgNm }]);
    render(<BannerSlider />);
    await screen.findByRole('heading', { name: '안내 배너' });

    expect(screen.queryByTestId('legacy-banner-image')).toBeNull();
    expect(screen.getByTestId('attachment-banner-image')).toHaveAttribute('data-attachment-id', '');
  });
});
