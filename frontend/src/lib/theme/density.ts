/**
 * 밀도 축(data-density)의 서버 측 결정자 — brand-theme.ts 와 같은 패턴.
 *
 * 밀도는 브랜드 프로필과 **직교**하는 배포 단위 축이다(사용자 위임 2026-08-23, D1 —
 * DEC-OPS-015): comfortable(기본, KRDS 대민 — 넉넉한 타깃)과 compact(ERP 업무 —
 * 고밀도)를 한 저장소에서 동시에 지원한다. comfortable 은 오버라이드가 전혀 없어
 * 프로필 선언값 그대로다 — 미설정 배포의 렌더링 무변경이 계약이다.
 *
 * 값은 요청마다 달라질 이유가 없는 배포 단위 설정이므로 서버 env 로만 읽고,
 * allowlist 밖 값은 기본 밀도로 강등한다 — 알 수 없는 값이 속성에 실리면 compact
 * 오버라이드 활성 여부가 env 오타에 좌우되는 비결정 상태가 되기 때문이다.
 *
 * 라우트별 밀도 배정은 브랜드 축과 동일하게 금지다(ADR-0004 — 전역 <html> 1곳 배선).
 */
export const DENSITIES = ['comfortable', 'compact'] as const;

export type Density = (typeof DENSITIES)[number];

export const DEFAULT_DENSITY: Density = 'comfortable';

export function resolveDensity(raw: string | undefined): Density {
  return (DENSITIES as readonly string[]).includes(raw ?? '')
    ? (raw as Density)
    : DEFAULT_DENSITY;
}
