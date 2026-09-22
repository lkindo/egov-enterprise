'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Palette,
  CheckCircle2,
  Info,
  ChevronRight,
  Image as ImageIcon,
  Monitor,
  RotateCcw,
  Settings2,
  Brush } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

import { Card,  CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

import { useToast } from '@/app/components/ui/toast';

const STORAGE_KEY = 'hub-theme-config';

type ThemeConfig = {
  primaryColor: string;
  borderRadius: string;
  layoutMode: 'MODERN';
  sidebarWidth: number;
};

/**
 * 곡률 배수 — globals.css 의 기본값과 정합해야 한다.
 * base 0.5rem 기준: section 1rem / widget 0.75rem / item 0.5rem (globals.css :root 기본값과 동일).
 */
const RADIUS_MULTIPLIER = { section: 2, widget: 1.5, item: 1 } as const;
const DEFAULT_BASE_RADIUS = 0.5;
const MAX_BASE_RADIUS = 1.5; // 슬라이더 상한과 동일

/** globals.css `--primary: 221.2 100% 50%` 와 동일한 폴백 채널 */
const FALLBACK_HSL = { h: 221.2, s: 100, l: 50 } as const;

// --- 디자인 토큰 기본값 ---
// primaryColor 는 globals.css 의 `--primary: 221.2 100% 50%` 를 HEX 로 환산한 값(왕복 변환 시 동일 채널값 복원).
const DEFAULT_THEME_CONFIG: ThemeConfig = {
  primaryColor: '#0050ff',
  borderRadius: String(DEFAULT_BASE_RADIUS), // rem 단위 베이스
  layoutMode: 'MODERN',
  sidebarWidth: 260,
};

// 색상 선택지(브랜드 후보값 데이터일 뿐, 스타일 하드코딩이 아니다)
const PRESET_COLORS = ['#0050ff', '#10b981', '#f43f5e', '#8b5cf6'] as const;

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

/** 배경 밝기에 따른 전경색 채널(globals.css 의 foreground 토큰과 동일한 값 사용) */
function foregroundChannelFor(hsl: { h: number; s: number; l: number }): string {
  return hsl.l > 60 ? '222.2 47.4% 11.2%' : '210 40% 98%';
}

function parseBaseRadius(value: string): number {
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
function buildTokenVars(config: ThemeConfig): Record<string, string> {
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

/**
 * 시스템 테마 및 디자인 토큰 제어 센터.
 *
 * <p><b>⚠ 저장 범위는 이 브라우저뿐이다.</b> 값은 {@code localStorage} 에만 보관되고 서버로 가지
 * 않는다 — 다른 기기·다른 사용자에게는 반영되지 않는다. "전역" 이라 함은 <b>이 브라우저의
 * {@code :root} 토큰</b>을 뜻하지 사이트 전체가 아니다.
 *
 * <p>[2026-08-06 문구 정정] 종전에는 버튼이 "전체 플랫폼 적용", 토스트가 "플랫폼 전반의 UI
 * 인프라에 즉각 적용" 이라고 말했다. 같은 화면 하단 안내문("브라우저에만 보관되므로 다른
 * 기기·다른 사용자에게는 전파되지 않습니다")과 <b>정면으로 모순</b>됐고, 버튼과 토스트가
 * 안내문을 반박하면 사용자는 강한 쪽을 믿는다. 서버 저장을 새로 만드는 대신 문구를 실제
 * 동작에 맞췄다 — 없는 기능을 있다고 말하는 것이 결함이지, 기능이 없는 것이 결함은 아니다.
 *
 * <p>배너 관리는 '배너 및 팝업관리' 전용 메뉴로 통합돼 있다.
 * 편집 중 미리보기는 우측 시뮬레이터 <b>스코프에만</b> 적용되며, {@code :root} 주입은
 * [이 브라우저에 적용] 을 눌렀을 때만 일어난다.
 */
export default function LayoutManagerClient() {
  const { toast } = useToast();

  // --- 디자인 토큰 상태 ---
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(DEFAULT_THEME_CONFIG);

  // 미리보기 전용 CSS 변수 (전역 오염 없음)
  // CSS 커스텀 프로퍼티는 React.CSSProperties 에 인덱스 시그니처가 없어 이중 캐스팅이 필요하다.
  const previewVars = useMemo(
    () => buildTokenVars(themeConfig) as unknown as React.CSSProperties,
    [themeConfig],
  );

  const baseRadius = parseBaseRadius(themeConfig.borderRadius);

  // 전역 주입은 명시적 저장 시에만 수행한다.
  const applyGlobalTokens = useCallback((config: ThemeConfig) => {
    const root = document.documentElement;
    Object.entries(buildTokenVars(config)).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, []);

  // 초기 로드 시 저장된 설정을 폼 상태로만 복원한다.
  // (전역 복원은 앱 전역 테마 프로바이더의 책임이며 현재 미구현 — 이 화면 진입만으로 전역 토큰을 바꾸지 않는다.)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      setThemeConfig(normalizeConfig(JSON.parse(saved)));
    } catch (e) {
      console.error('Failed to load theme config', e);
    }
  }, []);

  // --- 핸들러 ---
  const handleThemeSave = () => {
    applyGlobalTokens(themeConfig);
    // ⚠ 문구는 실제 저장 범위와 일치해야 한다. 종전 "플랫폼 전반의 UI 인프라에 즉각 적용" 은
    //   같은 화면 하단의 "브라우저에만 보관되므로 다른 기기·다른 사용자에게는 전파되지 않습니다"
    //   와 정면으로 모순됐다 — 버튼과 토스트가 안내문을 반박하면 사용자는 강한 쪽(버튼)을 믿는다.
    toast('이 브라우저에 적용했습니다. 서버에 저장되지 않으므로 다른 기기·다른 사용자에게는 반영되지 않습니다.', 'success');
  };

  const handleThemeReset = () => {
    const root = document.documentElement;
    TOKEN_KEYS.forEach((key) => root.style.removeProperty(key));
    localStorage.removeItem(STORAGE_KEY);
    setThemeConfig(DEFAULT_THEME_CONFIG);
    toast('디자인 토큰을 기본값(globals.css)으로 되돌렸습니다.', 'success');
  };

  return (
    // 루트 레이아웃이 이미 max-w-7xl · p-6/md:p-12/lg:p-16 을 제공하므로 화면 단위 p-10/max-w 이중 지정을 제거한다.
    <div className="flex flex-col gap-8 bg-transparent">
      {/* 테마 관리 헤더 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between border-b pb-8 border-border"
      >
        <div>
          {/* 근거 없는 버전 표기('v2.0 Beta')는 산출 출처가 없어 제거했다. */}
          <div className="flex items-center gap-3 mb-2">
            <Badge className="bg-primary/10 text-primary border-none font-bold px-4 py-1 rounded-lg tracking-tighter">디자인 토큰 엔진</Badge>
          </div>
          <h1 className="text-4xl font-bold tracking-tighter flex items-center gap-4 text-foreground">
            <Settings2 className="w-10 h-10 text-primary" />
            시스템 테마 및 디자인 토큰 제어
          </h1>
          <p className="mt-3 text-muted-foreground font-bold text-lg">
            에지(Edge) 곡률 및 브랜드 컬러 토큰을 정의합니다.
            <span className="text-hub-amber"> 설정은 이 브라우저에만 저장됩니다.</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleThemeReset}
            className="h-11 px-6 rounded-lg font-bold gap-2"
          >
            <RotateCcw size={18} />
            기본값 복원
          </Button>
          <Button
            onClick={handleThemeSave}
            className="h-11 px-10 rounded-lg font-bold gap-3 shadow-2xl shadow-primary/30 text-lg bg-primary hover:scale-105 transition-transform"
          >
            <CheckCircle2 size={22} />
            이 브라우저에 적용
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-12 gap-10 mt-4">
        {/* 좌측: 디자인 토큰 조절 패널 */}
        <div className="col-span-12 lg:col-span-4 space-y-10">

          <section className="space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <Palette size={20} className="text-primary" />
              곡률 시스템 (Radius Scale)
            </h3>
            <Card className="rounded-lg border-none shadow-[0_32px_80px_rgba(0,0,0,0.06)] bg-card/60 backdrop-blur-3xl p-2 overflow-hidden">
              <CardContent className="space-y-8 pt-8">
                <div className="space-y-6">
                  <div className="flex justify-between items-end px-2">
                    <Label htmlFor="theme-base-radius" className="text-sm font-bold text-muted-foreground tracking-widest">기준 곡률</Label>
                    <span className="text-4xl font-bold text-primary tabular-nums">{themeConfig.borderRadius}<span className="text-lg">rem</span></span>
                  </div>
                  <div className="px-2">
                    <input
                      id="theme-base-radius"
                      type="range" min="0" max="1.5" step="0.05"
                      value={themeConfig.borderRadius}
                      onChange={(e) => setThemeConfig({ ...themeConfig, borderRadius: e.target.value })}
                      className="w-full h-3 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                      aria-label="곡률 베이스 값(rem)"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 bg-muted rounded-lg border border-border">
                      <p className="text-xs font-bold text-muted-foreground mb-2">섹션 곡률</p>
                      <p className="text-2xl font-bold">{(baseRadius * RADIUS_MULTIPLIER.section).toFixed(2)}<span className="text-xs ml-1">rem</span></p>
                    </div>
                    <div className="p-6 bg-muted rounded-lg border border-border">
                      <p className="text-xs font-bold text-muted-foreground mb-2">아이템 곡률</p>
                      <p className="text-2xl font-bold">{(baseRadius * RADIUS_MULTIPLIER.item).toFixed(2)}<span className="text-xs ml-1">rem</span></p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <Brush size={20} className="text-primary" />
              브랜드 아이덴티티 (Color)
            </h3>
            <Card className="rounded-lg border-none shadow-[0_32px_80px_rgba(0,0,0,0.06)] bg-card/60 backdrop-blur-3xl p-2">
              <CardContent className="space-y-6 pt-8">
                <div className="grid grid-cols-4 gap-4">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`브랜드 색상 ${color} 선택`}
                      aria-pressed={themeConfig.primaryColor === color}
                      onClick={() => setThemeConfig({ ...themeConfig, primaryColor: color })}
                      className={`h-11 rounded-lg transition-all border-4 ${themeConfig.primaryColor === color ? 'border-primary ring-8 ring-primary/10 scale-105' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex gap-4 p-1">
                  <Input
                    id="theme-primary-color"
                    type="color" value={themeConfig.primaryColor}
                    aria-label="브랜드 기본 색상"
                    onChange={(e) => setThemeConfig({ ...themeConfig, primaryColor: e.target.value })}
                    className="h-11 w-24 cursor-pointer p-2 rounded-lg border-none shadow-inner bg-muted"
                  />
                  <div className="flex-1 h-11 bg-muted rounded-lg flex items-center px-6 font-bold text-lg text-foreground justify-center tracking-widest border border-border">
                    {themeConfig.primaryColor.toUpperCase()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <div className="p-8 bg-warning/10 rounded-lg border-2 border-dashed border-warning/40 space-y-3">
            <div className="flex items-center gap-2 text-foreground font-bold">
              <Info size={18} className="text-hub-amber" />
              <span>안내 사항</span>
            </div>
            <p className="text-sm font-bold text-muted-foreground leading-relaxed">
              편집 중에는 우측 시뮬레이터에만 반영되며, <b>[이 브라우저에 적용]</b>을 눌러야 화면 전역 토큰에 주입됩니다. <br/>
              <b>설정은 이 브라우저에만 저장됩니다(localStorage).</b> 서버에 저장되지 않으므로 다른 기기·다른 사용자·시크릿 창에는 반영되지 않으며, 브라우저 저장소를 비우면 사라집니다. <br/>
              <b>프로모션 배너 및 팝업 자산</b> 관리는 <Link href="/admin/system/banner" className="text-primary underline decoration-2">배너 및 팝업 관리</Link> 메뉴를 이용해 주세요.
            </p>
          </div>
        </div>

        {/* 우측: 시각적 시뮬레이터 — 토큰 미리보기는 이 컨테이너 스코프로 한정된다. */}
        <div className="col-span-12 lg:col-span-8">
          <div
            style={previewVars}
            className="h-full min-h-[700px] bg-muted/40 rounded-lg border-4 border-dashed border-border flex flex-col items-center justify-center p-12 relative overflow-hidden group"
          >
            <div className="absolute top-10 left-12 flex items-center gap-4">
              <Badge variant="outline" className="bg-card/80 backdrop-blur-md border-none font-bold px-5 py-2.5 rounded-lg flex gap-3 shadow-lg">
                <Monitor size={16} className="text-primary" />
                실시간 시뮬레이터
              </Badge>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${themeConfig.borderRadius}-${themeConfig.primaryColor}`}
                initial={{ scale: 0.9, opacity: 0, rotateY: -10 }}
                animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                className="bg-card shadow-[0_60px_120px_rgba(0,0,0,0.12)] p-14 w-[580px] flex flex-col items-center text-center gap-12 transition-all"
                style={{
                  borderRadius: 'var(--radius-hub-section)',
                  borderColor: 'hsl(var(--primary))',
                }}
              >
                <div
                  className="w-32 h-32 flex items-center justify-center shadow-inner transition-transform duration-700 group-hover:rotate-12 bg-primary/10 text-primary"
                  style={{ borderRadius: 'var(--radius-hub-widget)' }}
                >
                  <ImageIcon className="w-14 h-11" />
                </div>

                <div className="space-y-5">
                  <h3 className="text-5xl font-bold tracking-tighter text-primary">
                    UX 토큰 미리보기
                  </h3>
                  <p className="text-muted-foreground font-bold text-xl leading-relaxed">
                    선택하신 <span className="text-foreground">곡률과 테마 컬러</span>가 <br/>
                    실제 플랫폼 컴포넌트로 구현된 모습입니다.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6 w-full">
                  {[1, 2].map(i => (
                    <div
                      key={i}
                      className="h-11 bg-muted flex items-center justify-center font-bold text-muted-foreground border border-border text-lg"
                      style={{ borderRadius: 'var(--radius-hub-item)' }}
                    >
                      구성요소 {i}
                    </div>
                  ))}
                </div>

                {/*
                  미리보기 전용 표본이다. 과거에는 핸들러 없는 <Button> 이라 눌러도 아무 일도 일어나지 않는 死버튼이었다.
                  실제로 수행할 동작이 없으므로 상호작용 요소가 아닌 표현 요소로 낮춘다(스크린리더에도 버튼으로 읽히지 않는다).
                */}
                <div
                  role="presentation"
                  className="w-full h-11 text-2xl font-bold gap-4 shadow-2xl px-10 bg-primary text-primary-foreground inline-flex items-center justify-center select-none"
                  style={{
                    borderRadius: 'var(--radius-hub-item)',
                    boxShadow: '0 25px 50px hsl(var(--primary) / 0.25)',
                  }}
                >
                  버튼 미리보기 <ChevronRight size={32} strokeWidth={3} />
                </div>
              </motion.div>
            </AnimatePresence>

            {/* 메타 정보 */}
            <div className="mt-16 flex items-center gap-3 text-muted-foreground font-bold">
              <Info size={18} />
              <span>현재 시각화된 섹션 곡률 수치: {(baseRadius * RADIUS_MULTIPLIER.section).toFixed(2)} rem</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
