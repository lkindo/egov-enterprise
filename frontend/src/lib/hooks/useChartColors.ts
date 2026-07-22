'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

/**
 * 차트 축·그리드·마크 색상의 단일 진실 원천 (SSOT).
 *
 * 왜 훅인가:
 * Recharts 는 grid/axis 색을 SVG **presentation attribute** 로 방출하므로
 * `stroke="var(--border)"` 같은 CSS 변수 참조가 해석되지 않는다.
 * 따라서 런타임에 `getComputedStyle(document.documentElement)` 로
 * 디자인 토큰(globals.css `:root` / `.dark`)을 읽어 **구체 색 문자열**로 변환한다.
 * → 하드코딩 HEX 없이 라이트/다크 양쪽에서 토큰과 100% 동기화된다.
 *
 * 대비(WCAG 2.1) 설계 근거 — 기준 배경은 차트가 놓이는 `--card`:
 *  - `tick`  = `--muted-foreground` 원색. 축 눈금은 **텍스트**이므로 1.4.3 AA 4.5:1 필요.
 *              라이트 ≈ 8.9:1, 다크 ≈ 10.0:1 → 통과.
 *              (기존 화면들이 쓰던 `#cbd5e1` 는 라이트에서 1.6:1 로 AA 미달이었다.)
 *  - `axis`  = `--muted-foreground` @ 62% 알파. 축선/기준선은 **비텍스트 구조물**이므로
 *              1.4.11 의 3:1 이 기준. 라이트 ≈ 3.3:1, 다크 ≈ 4.4:1 → 통과.
 *  - `grid`  = `--border` 원색. 그리드라인은 값 전달을 축 라벨(=`tick`)이 전담하는
 *              **장식적 보조선**이라 1.4.11 의 "이해에 필수적인 그래픽" 예외에 해당한다.
 *              앱의 모든 경계선과 동일한 톤(one-step-off-surface, hairline)을 유지해
 *              데이터 마크를 압도하지 않게 한다. 3:1 로 올리면 오히려 그리드가
 *              데이터보다 강해지는 안티패턴이 된다.
 */
export interface ChartColors {
    /** 그리드 hairline — 장식적 보조선(`--border`) */
    grid: string;
    /** 축선/기준선 — 비텍스트 3:1 충족(`--muted-foreground` @62%) */
    axis: string;
    /** 축 눈금 텍스트 — 4.5:1 충족(`--muted-foreground`) */
    tick: string;
    /** 단일 시리즈 강조색(`--primary`) — 테마별로 자동 반전 */
    accent: string;
    /** 호버 커서 등 초저채도 강조 배경(`--primary` @6%) */
    accentSoft: string;
    /** 차트 표면색(`--card`) — 마커 중심/마크 간 2px 간극에 사용 */
    surface: string;
}

/** 축선/기준선이 라이트·다크 양쪽에서 3:1 을 넘도록 실측으로 고정한 알파값. */
const AXIS_ALPHA = 0.62;
/** 호버 커서용 초저채도 알파. 마크 위 하이라이트라 대비 기준 대상이 아니다. */
const ACCENT_SOFT_ALPHA = 0.06;

/**
 * 토큰이 아직 주입되지 않은 시점(SSR·테스트 환경)의 안전값.
 * `currentColor` 는 부모의 텍스트 색을 상속하므로 색이 사라지지 않는다.
 * 실제 차트는 `SafeResponsiveContainer` 가 마운트 이후에만 렌더하므로
 * 이 값이 화면에 남는 일은 없다.
 */
const FALLBACK_COLOR = 'currentColor';

const FALLBACK_COLORS: ChartColors = {
    grid: FALLBACK_COLOR,
    axis: FALLBACK_COLOR,
    tick: FALLBACK_COLOR,
    accent: FALLBACK_COLOR,
    accentSoft: FALLBACK_COLOR,
    surface: FALLBACK_COLOR,
};

/**
 * globals.css 토큰은 `--border: 214.3 31.8% 91.4%` 처럼 **HSL 성분만** 저장한다.
 * 완전한 색 문자열로 저장된 토큰(리브랜딩 시 가능)도 그대로 통과시킨다.
 */
function resolveToken(styles: CSSStyleDeclaration, name: string, alpha?: number): string {
    const raw = styles.getPropertyValue(name).trim();
    if (!raw) return FALLBACK_COLOR;
    if (/^(#|rgb|hsl|oklch|lab|lch|color\()/i.test(raw)) return raw;
    return alpha === undefined ? `hsl(${raw})` : `hsl(${raw} / ${alpha})`;
}

function readChartColors(): ChartColors {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return FALLBACK_COLORS;
    }
    const styles = getComputedStyle(document.documentElement);
    return {
        grid: resolveToken(styles, '--border'),
        axis: resolveToken(styles, '--muted-foreground', AXIS_ALPHA),
        tick: resolveToken(styles, '--muted-foreground'),
        accent: resolveToken(styles, '--primary'),
        accentSoft: resolveToken(styles, '--primary', ACCENT_SOFT_ALPHA),
        surface: resolveToken(styles, '--card'),
    };
}

/**
 * 차트 공용 색상 훅. 테마 전환 시 토큰을 다시 읽어 라이트/다크에 자동 적응한다.
 *
 * @example
 * const c = useChartColors();
 * <CartesianGrid stroke={c.grid} />
 * <XAxis tick={{ fill: c.tick }} axisLine={{ stroke: c.axis }} />
 */
export function useChartColors(): ChartColors {
    const { resolvedTheme } = useTheme();
    // 클라이언트 첫 렌더에서 이미 DOM 이 존재하므로 lazy initializer 로 즉시 실측한다.
    const [colors, setColors] = useState<ChartColors>(readChartColors);

    useEffect(() => {
        setColors(readChartColors());
    }, [resolvedTheme]);

    return colors;
}

export default useChartColors;
