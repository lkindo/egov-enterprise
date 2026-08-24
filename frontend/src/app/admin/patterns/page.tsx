import PatternGalleryClient from './PatternGalleryClient';

export const metadata = {
  title: '업무 화면 패턴 갤러리 | 참조',
  description: '업무 화면 문법 카탈로그의 archetype 참조 구현을 정적 표본 데이터로 확인합니다.',
};

/**
 * 업무 화면 패턴 갤러리.
 *
 * 정본 스펙: docs/02-architecture/work-screen-grammar-catalog.md
 * 서버 데이터를 조회하지 않는 참조 화면이라 세션·시드 상태와 무관하게 결정적으로 렌더된다.
 */
export default function PatternGalleryPage() {
  return <PatternGalleryClient />;
}
