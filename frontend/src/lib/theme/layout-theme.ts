const STORAGE_KEY = 'hub-theme-config';

export type ThemeConfig = {
  primaryColor: string;
  borderRadius: string;
  layoutMode: 'MODERN';
  sidebarWidth: number;
};

/**
 * 곡률 배수 — globals.css 의 기본값과 정합해야 한다.
 * base 0.5rem 기준: section 1rem / widget 0.75rem / item 0.5rem (globals.css :root 기본값과 동일).
 */
export const RADIUS_MULTIPLIER = { section: 2, widget: 1.5, item: 1 } as const;
const DEFAULT_BASE_RADIUS = 0.5;
const MAX_BASE_RADIUS = 1.5; // 슬라이더 상한과 동일

/** globals.css `--primary: 221.2 100% 50%` 와 동일한 폴백 채널 */
const FALLBACK_HSL = { h: 221.2, s: 100, l: 50 } as const;

// --- 디자인 토큰 기본값 ---
// primaryColor 는 globals.css 의 `--primary: 221.2 100% 50%` 를 HEX 로 환산한 값(왕복 변환 시 동일 채널값 복원).
export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  primaryColor: '#0050ff',
  borderRadius: String(DEFAULT_BASE_RADIUS), // rem 단위 베이스
  layoutMode: 'MODERN',
  sidebarWidth: 260,
};

const HEX_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** #rgb | #rrggbb → { h, s, l } (실패 시 null) */
function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const matched = HEX_PATTERN.exec(hex.trim());
  if (!matched) return null;

  let raw = matched[1];
  if (raw.length === 3) raw = raw.split('').map((c) => c + c).join('');

  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;
  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const round1 = (n: number) => Math.round(n * 10) / 10;
  return { h: round1(h), s: round1(s * 100), l: round1(l * 100) };
}

/**
 * globals.css 의 색상 토큰(`--primary` 등)은 **완성색이 아니라 HSL 채널 문자열**(예: `221.2 100% 50%`)이다.
 * `hsl(var(--primary))` 형태로 소비되므로 HEX 를 그대로 주입하면 `hsl(#3b82f6)` 이 되어 색이 통째로 무효화된다.
 */
function toHslChannel(hsl: { h: number; s: number; l: number }): string {
  return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
}

/** 전경색 후보 두 개(globals.css 의 foreground 토큰과 같은 값). */
const DARK_FOREGROUND = { channel: '222.2 47.4% 11.2%', hsl: { h: 222.2, s: 47.4, l: 11.2 } } as const;
const LIGHT_FOREGROUND = { channel: '210 40% 98%', hsl: { h: 210, s: 40, l: 98 } } as const;
/** 토큰 두 후보가 모두 하한에 못 미칠 때의 마지막 후보 — 어느 배경이든 둘 중 하나는 4.5:1 을 넘는다. */
const BLACK_FOREGROUND = { channel: '0 0% 0%', hsl: { h: 0, s: 0, l: 0 } } as const;
const WHITE_FOREGROUND = { channel: '0 0% 100%', hsl: { h: 0, s: 0, l: 100 } } as const;
/** 기본 단추 글자(text-sm)는 일반 텍스트다 — WCAG 2.2 1.4.3 의 일반 텍스트 하한. */
const MINIMUM_TEXT_CONTRAST = 4.5;

/** HSL(도·%·%) → WCAG 2.x 상대 휘도. */
function relativeLuminance({ h, s, l }: { h: number; s: number; l: number }): number {
  const saturation = s / 100;
  const lightness = l / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const sector = (((h % 360) + 360) % 360) / 60;
  const second = chroma * (1 - Math.abs((sector % 2) - 1));
  const [r1, g1, b1] = sector < 1 ? [chroma, second, 0]
    : sector < 2 ? [second, chroma, 0]
      : sector < 3 ? [0, chroma, second]
        : sector < 4 ? [0, second, chroma]
          : sector < 5 ? [second, 0, chroma]
            : [chroma, 0, second];
  const offset = lightness - chroma / 2;
  const linear = (channel: number) => {
    const value = channel + offset;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r1) + 0.7152 * linear(g1) + 0.0722 * linear(b1);
}

/** WCAG 2.x 대비율(1~21). */
function contrastRatio(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/**
 * 배경색에 대비가 더 큰 전경색 채널.
 *
 * [2026-11-24] 종전에는 HSL 명도 60 을 넘는지로만 골랐다. 명도는 지각 밝기가 아니라 녹색·청록처럼 휘도가 큰 색에서 크게 어긋난다 —
 * 프리셋 #10b981 은 명도 39 라 흰 글자를 골랐지만 실제 대비는 약 2.4:1(어두운 글자는 약 7:1)이었다. WCAG 상대 휘도로 두 후보의
 * 대비를 재서 큰 쪽을 쓴다. 기본색(#0050ff)은 종전처럼 밝은 글자다. 두 토큰이 모두 일반 텍스트 하한(4.5:1)에 못 미치면
 * (프리셋 #8b5cf6 은 약 4.2:1·4.0:1) 순수한 검정·흰색 가운데 대비가 큰 쪽을 쓴다 — 둘 중 하나는 어느 배경에서나 하한을 넘는다.
 */
function foregroundChannelFor(hsl: { h: number; s: number; l: number }): string {
  const background = relativeLuminance(hsl);
  const best = (candidates: ReadonlyArray<{ channel: string; hsl: { h: number; s: number; l: number } }>) => candidates
    .map((candidate) => ({ channel: candidate.channel, contrast: contrastRatio(background, relativeLuminance(candidate.hsl)) }))
    .reduce((winner, next) => (next.contrast > winner.contrast ? next : winner));
  const token = best([LIGHT_FOREGROUND, DARK_FOREGROUND]);
  return token.contrast >= MINIMUM_TEXT_CONTRAST ? token.channel : best([WHITE_FOREGROUND, BLACK_FOREGROUND]).channel;
}

export function parseBaseRadius(value: string): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_BASE_RADIUS;
  return Math.min(parsed, MAX_BASE_RADIUS);
}

/** #rgb → #rrggbb (input[type=color] 는 6자리 HEX 만 허용) */
function expandHex(hex: string): string {
  const normalized = hex.trim().toLowerCase().replace(/^#?/, '#');
  if (normalized.length === 4) {
    return `#${normalized.slice(1).split('').map((c) => c + c).join('')}`;
  }
  return normalized;
}

/**
 * 설정 → CSS 변수 맵.
 * 주의: Tailwind v4 `@theme` 의 `--color-primary: hsl(var(--primary))` 는 :root 에서 **치환이 끝난 값**이 상속된다.
 * 따라서 하위 스코프(미리보기 컨테이너)에서 `--primary` 만 바꾸면 `bg-primary` 계열 유틸리티는 따라오지 않으므로
 * 완성색 토큰(`--color-*`)도 함께 덮어써야 스코프 미리보기가 성립한다.
 */
export function buildTokenVars(config: ThemeConfig): Record<string, string> {
  const base = parseBaseRadius(config.borderRadius);
  const hsl = hexToHsl(config.primaryColor) ?? FALLBACK_HSL;
  const channel = toHslChannel(hsl);
  const foreground = foregroundChannelFor(hsl);

  return {
    '--radius-hub-section': `${+(base * RADIUS_MULTIPLIER.section).toFixed(3)}rem`,
    '--radius-hub-widget': `${+(base * RADIUS_MULTIPLIER.widget).toFixed(3)}rem`,
    '--radius-hub-item': `${+(base * RADIUS_MULTIPLIER.item).toFixed(3)}rem`,
    '--primary': channel,
    '--primary-foreground': foreground,
    '--ring': channel,
    '--color-primary': `hsl(${channel})`,
    '--color-primary-foreground': `hsl(${foreground})`,
    '--color-ring': `hsl(${channel})`,
  };
}

const TOKEN_KEYS = Object.keys(buildTokenVars(DEFAULT_THEME_CONFIG));
const savedThemeListeners = new Set<() => void>();

function notifySavedThemeListeners() {
  savedThemeListeners.forEach((listener) => listener());
}

export function subscribeSavedThemeConfig(onStoreChange: () => void): () => void {
  savedThemeListeners.add(onStoreChange);
  if (typeof window === 'undefined') {
    return () => {
      savedThemeListeners.delete(onStoreChange);
    };
  }
  const handleStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === STORAGE_KEY) onStoreChange();
  };
  window.addEventListener('storage', handleStorage);
  return () => {
    savedThemeListeners.delete(onStoreChange);
    window.removeEventListener('storage', handleStorage);
  };
}

export function readSavedThemeSnapshot(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function parseSavedThemeSnapshot(snapshot: string | null): ThemeConfig | null {
  if (!snapshot) return null;
  try {
    const parsed: unknown = JSON.parse(snapshot);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return normalizeConfig(parsed);
  } catch {
    return null;
  }
}

/*
  브라우저 저장소는 사생활 모드·저장소 차단에서 예외를 던진다(PopupManager 의 DIP V9 기록과 같은 이유).
  이 화면의 저장은 편의 기능이므로, 저장소를 쓸 수 없으면 토큰은 이번 화면에서만 적용되고 저장·복원만 잃는다.
*/
export function readSavedThemeConfig(): ThemeConfig | null {
  return parseSavedThemeSnapshot(readSavedThemeSnapshot());
}

export function writeSavedThemeConfig(config: ThemeConfig): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    notifySavedThemeListeners();
    return true;
  } catch {
    // 저장하지 못하면 이번 화면에서만 적용된다.
    return false;
  }
}

function clearSavedThemeConfig() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    notifySavedThemeListeners();
  } catch {
    // 저장소를 쓸 수 없으면 지울 것도 없다.
  }
}

/** localStorage 등 외부 입력을 신뢰하지 않고 안전한 형태로 정규화한다. */
function normalizeConfig(raw: unknown): ThemeConfig {
  const input = (raw ?? {}) as Partial<ThemeConfig>;
  const color = typeof input.primaryColor === 'string' && HEX_PATTERN.test(input.primaryColor)
    ? input.primaryColor
    : DEFAULT_THEME_CONFIG.primaryColor;
  const radius = typeof input.borderRadius === 'string' || typeof input.borderRadius === 'number'
    ? String(parseBaseRadius(String(input.borderRadius)))
    : DEFAULT_THEME_CONFIG.borderRadius;

  return {
    primaryColor: expandHex(color),
    borderRadius: radius,
    layoutMode: 'MODERN',
    sidebarWidth: typeof input.sidebarWidth === 'number' && input.sidebarWidth > 0
      ? input.sidebarWidth
      : DEFAULT_THEME_CONFIG.sidebarWidth,
  };
}

/** 저장과 새 로드 복원은 같은 토큰 변환을 사용한다. */
export function applyThemeTokens(config: ThemeConfig) {
  Object.entries(buildTokenVars(config)).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
  });
}

const COLOR_TOKEN_KEYS = new Set([
  '--primary', '--primary-foreground', '--ring', '--color-primary', '--color-primary-foreground', '--color-ring',
]);

/**
 * 새 로드 복원. 저장한 색은 라이트 화면에서 고른 값이라 다크 블록의 색을 덮으면 대비가 무너진다
 * (#0050ff 는 다크 배경에서 약 3:1). 기본색 그대로 저장한 값은 고른 색이 아니므로 브랜드 프로필 색을 따른다.
 * 반경 토큰은 모드와 무관하게 복원한다.
 */
export function restoreThemeTokens(config: ThemeConfig, dark: boolean) {
  const customColor = config.primaryColor.toLowerCase() !== DEFAULT_THEME_CONFIG.primaryColor;
  Object.entries(buildTokenVars(config)).forEach(([key, value]) => {
    if (COLOR_TOKEN_KEYS.has(key) && (dark || !customColor)) {
      document.documentElement.style.removeProperty(key);
    } else {
      document.documentElement.style.setProperty(key, value);
    }
  });
}

export function resetThemeTokens() {
  TOKEN_KEYS.forEach((key) => document.documentElement.style.removeProperty(key));
  clearSavedThemeConfig();
}
