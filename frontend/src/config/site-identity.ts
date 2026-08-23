/**
 * Site Identity Manifest (SSOT) — Track B(채택 키트)
 *
 * 사이트(제품) 정체성 문자열의 단일 정의처다. 이 프레임워크를 채택하는
 * 팀은 **이 파일 하나만 수정**해서 리브랜딩한다 — 레이아웃 셸(헤더·사이드바·
 * 푸터·로그인·로딩 화면)과 메타데이터 <title> 이 전부 여기서 값을 읽는다.
 *
 * 규칙:
 * - 여기에는 "제품 정체성" 문자열만 둔다. 화면별 도메인 카피(페이지 제목의
 *   업무 부분, 안내 문구, 예시 데이터)는 각 화면 소유다.
 * - 값 변경은 순수 텍스트 치환이어야 한다. 레이아웃·접근성 구조(sr-only h1,
 *   aria 계약)는 소비처가 소유하므로 여기서 마크업을 만들지 않는다.
 */
export interface SiteIdentity {
  /** 사이트 공식 명칭 — 루트 메타데이터 기본 <title>. */
  siteName: string;
  /** 사이트 소개 한 줄 — 루트 메타데이터 기본 description. */
  siteDescription: string;
  /** 짧은 명칭 — 로그인 카드 제목, 모바일 사이드바 워드마크 1행. */
  siteShortName: string;
  /** 포털 명칭 — 헤더 워드마크 2행. */
  sitePortalName: string;
  /** 브랜드 표기 — 헤더 워드마크 1행. */
  brandName: string;
  /** 포털 축약 표기 — 모바일 사이드바 워드마크 2행. */
  portalShortName: string;
  /** 접근성용 제품명 — 루트 로딩 화면의 sr-only h1. */
  siteAccessibleName: string;
  /** 제품(프레임워크) 명칭 — 관리자 화면 <title> 접미사. */
  frameworkName: string;
  /** 로고 마크(2~3자) — 헤더·사이드바 로고 박스. */
  logoMark: string;
  /** 푸터 저작권 표기 전문. */
  copyright: string;
}

export const SITE_IDENTITY = {
  siteName: '전자정부 표준프레임워크 - 엔터프라이즈 포털',
  siteDescription: '전사 업무 포털에서 공통 업무와 협업 기능을 제공합니다.',
  siteShortName: '엔터프라이즈',
  sitePortalName: '전자정부 포털',
  brandName: '전자정부 5.0',
  portalShortName: '포털 5.0',
  siteAccessibleName: '전자정부 Enterprise',
  frameworkName: '전자정부 표준프레임워크',
  logoMark: 'EG',
  copyright: '© 2026 전자정부 프레임워크 현대화 프로젝트.',
} as const satisfies SiteIdentity;
