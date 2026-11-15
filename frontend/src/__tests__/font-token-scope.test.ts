import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 🔤 글꼴 토큰 스코프 가드 — 선언 위치와 별칭 계산 위치를 맞춘다(GAP-UIF-001).
 *
 * `globals.css` 의 `@theme` 는 `--font-sans` 를 :root 에서 계산한다. next/font 변수가 `body` 에만
 * 있으면 그 시점에 값이 없어 별칭 전체가 무효가 되고, 선언도 preload 도 그대로인 채 브라우저만
 * 시스템 글꼴로 떨어진다. 타입 검사·린트·스냅샷 어디에도 걸리지 않는 조용한 회귀라 여기서 고정한다.
 *
 * [2026-11-15] 본문 글꼴은 Pretendard 를 글자 범위별로 나눈 Nuri Sans 다(scripts/fonts/build-nuri-sans.py).
 * 조각 CSS 는 생성물이라 손으로 고치면 범위가 겹치거나(쓰지 않을 조각까지 받는다) 빠지고(그 글자만 시스템 글꼴),
 * 파일이 바뀌어도 아무 검사에 걸리지 않는다 — 여기서 생성 기록(manifest)과 대조한다.
 *
 * 이 가드는 **선언**만 본다. 실제로 그 글꼴로 그려지는지는 계산된 스타일의 몫이며,
 * e2e(`quality/login-accessibility.spec.ts`)가 로그인 화면에서 확인한다.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const layout = readFileSync(join(root, 'src/app/layout.tsx'), 'utf8');
const globals = readFileSync(join(root, 'src/app/globals.css'), 'utf8');
const FONT_VARIABLES = ['inter.variable', 'outfit.variable'];

const htmlTag = layout.slice(layout.indexOf('<html'), layout.indexOf('<body'));
const bodyOpen = layout.indexOf('<body');
const bodyTag = layout.slice(bodyOpen, layout.indexOf('>', bodyOpen) + 1);

const fontCssPath = join(root, 'src/app/fonts/nuri-sans.css');
const fontCss = readFileSync(fontCssPath, 'utf8');
const fontDir = join(root, 'src/app/fonts/nuri-sans');
type ManifestSlice = { name: string; file: string; bytes: number; sha256: string; unicodeRange: string; glyphRange: string };
const manifest = JSON.parse(readFileSync(join(root, 'scripts/fonts/nuri-sans.manifest.json'), 'utf8')) as {
  family: string;
  weight: string;
  slices: ManifestSlice[];
};

type Face = {
  family: string; display: string; weight: string; style: string; src: string; file: string;
  ranges: Array<[number, number]>; rangeText: string;
};

function parseRanges(text: string): Array<[number, number]> {
  return text.split(',').map((part) => {
    const match = /^U\+([0-9A-F]+)(?:-([0-9A-F]+))?$/i.exec(part.trim());
    if (!match) throw new Error(`unicode-range 형식이 아니다: ${part}`);
    const lo = parseInt(match[1], 16);
    return [lo, match[2] ? parseInt(match[2], 16) : lo];
  });
}

const faces: Face[] = [...fontCss.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(([, body]) => {
  const prop = (name: string) => new RegExp(`${name}:\\s*([^;]+);`).exec(body)?.[1].trim() ?? '';
  const file = /url\('\.\/nuri-sans\/([^']+)'\)/.exec(prop('src'))?.[1] ?? '';
  return {
    family: prop('font-family').replace(/['"]/g, ''),
    display: prop('font-display'),
    weight: prop('font-weight'),
    style: prop('font-style'),
    src: prop('src'),
    file,
    rangeText: prop('unicode-range'),
    ranges: parseRanges(prop('unicode-range')),
  };
});

function covered(cp: number) {
  return faces.filter((face) => face.ranges.some(([lo, hi]) => lo <= cp && cp <= hi)).length;
}

describe('글꼴 토큰 스코프', () => {
  it('next/font 변수를 <html> 에 선언한다', () => {
    for (const variable of FONT_VARIABLES) {
      expect(htmlTag).toContain(variable);
    }
  });

  it('body 에는 같은 변수를 다시 선언하지 않는다 — 스코프가 갈리면 별칭이 무효가 된다', () => {
    for (const variable of FONT_VARIABLES) {
      expect(bodyTag).not.toContain(variable);
    }
  });

  it('--font-sans 는 Nuri Sans 를 맨 앞에 둔다', () => {
    const line = globals.split('\n').find((text) => text.trim().startsWith('--font-sans:'));
    expect(line).toBeDefined();
    expect(line?.replace('--font-sans:', '').trim()).toMatch(/^"Nuri Sans",/);
  });

  it('루트 레이아웃이 조각 CSS 를 globals.css 보다 먼저 불러온다', () => {
    const fontImport = layout.indexOf("import './fonts/nuri-sans.css';");
    expect(fontImport).toBeGreaterThan(-1);
    expect(fontImport).toBeLessThan(layout.indexOf("import './globals.css';"));
  });
});

describe('Nuri Sans 조각(생성물)', () => {
  it('조각 CSS 가 생성 기록과 같다 — 파일·범위·바이트 해시', () => {
    expect(faces.map((face) => face.file)).toEqual(manifest.slices.map((slice) => slice.file));
    for (const slice of manifest.slices) {
      const face = faces.find((candidate) => candidate.file === slice.file);
      expect(face?.rangeText, slice.name).toBe(slice.unicodeRange);
      const bytes = readFileSync(join(fontDir, slice.file));
      expect(bytes.length, slice.name).toBe(slice.bytes);
      expect(createHash('sha256').update(bytes).digest('hex'), slice.name).toBe(slice.sha256);
    }
    const onDisk = readdirSync(fontDir).filter((name) => name.endsWith('.woff2')).sort();
    expect(onDisk).toEqual(manifest.slices.map((slice) => slice.file).sort());
  });

  it('모든 조각이 같은 이름·가변 굵기 전 구간·optional·woff2 이고 범위가 서로 겹치지 않는다', () => {
    expect(faces.length).toBeGreaterThan(0);
    // 굵기를 한 값(예: 400)으로 적으면 700·900 을 쓰는 제목이 가변 축 대신 합성 굵기로 그려진다 — 원본 축 범위와 같아야 한다.
    expect(manifest.weight).toMatch(/^\d+ \d+$/);
    for (const face of faces) {
      expect(face.family).toBe('Nuri Sans');
      expect(face.display).toBe('optional');
      expect(face.weight, face.file).toBe(manifest.weight);
      expect(face.style, face.file).toBe('normal');
      expect(face.src, face.file).toBe(`url('./nuri-sans/${face.file}') format('woff2')`);
    }
    const all = faces.flatMap((face) => face.ranges.map(([lo, hi]) => ({ lo, hi, file: face.file })))
      .sort((a, b) => a.lo - b.lo);
    for (let i = 1; i < all.length; i += 1) {
      expect(all[i].lo, `${all[i - 1].file} 와 ${all[i].file} 가 겹친다`).toBeGreaterThan(all[i - 1].hi);
    }
  });

  it('출력 가능한 ASCII·한글 음절 11,172자·현대 한글 호환 자모를 한 조각의 선언 범위씩 덮는다', () => {
    const required = [
      ...Array.from({ length: 0x7e - 0x20 + 1 }, (_, i) => 0x20 + i),
      ...Array.from({ length: 0xd7a3 - 0xac00 + 1 }, (_, i) => 0xac00 + i),
      ...Array.from({ length: 0x3163 - 0x3131 + 1 }, (_, i) => 0x3131 + i),
    ];
    const missing = required.filter((cp) => covered(cp) !== 1);
    expect(missing.map((cp) => `U+${cp.toString(16).toUpperCase()}`)).toEqual([]);
  });

  it('KS X 1001 완성형 2,350자는 모두 글자로 담는다 — 드문 음절만 시스템 글꼴로 넘긴다', () => {
    // EUC-KR 의 한글 완성형 영역(상위 0xB0~0xC8, 하위 0xA1~0xFE)을 풀어 KS X 1001 음절을 얻는다.
    const decoder = new TextDecoder('euc-kr');
    const ks: number[] = [];
    for (let lead = 0xb0; lead <= 0xc8; lead += 1) {
      for (let trail = 0xa1; trail <= 0xfe; trail += 1) {
        ks.push(decoder.decode(new Uint8Array([lead, trail])).codePointAt(0)!);
      }
    }
    expect(ks).toHaveLength(2350);
    const glyphs = manifest.slices.flatMap((slice) => parseRanges(slice.glyphRange));
    const missing = ks.filter((cp) => !glyphs.some(([lo, hi]) => lo <= cp && cp <= hi));
    expect(missing.map((cp) => String.fromCodePoint(cp))).toEqual([]);
  });

  // Lighthouse 실측(2026-11-15): 로그인 첫 화면은 core·ko-1·ko-2 세 조각만 받는다(약 185KB, 종전 한 벌 2,057,688B).
  //   어느 조각을 받는지는 e2e(quality/login-accessibility.spec.ts)가 요청 기록으로 본다.
  it('로그인 첫 화면이 받는 세 조각(기본 라틴·화면 문구 음절)은 합쳐 200,000B 이하다', () => {
    const size = (name: string) => manifest.slices.find((slice) => slice.name === name)?.bytes ?? Infinity;
    expect(size('core') + size('ko-1') + size('ko-2')).toBeLessThanOrEqual(200_000);
  });

  it('OFL 예약 이름을 쓰지 않고, 라이선스 전문과 변경 기록을 조각 옆에 둔다', () => {
    expect(manifest.family).toBe('Nuri Sans');
    for (const reserved of [/pretendard/i, /\binter\b/i, /\bsource\b/i, /m plus/i]) {
      expect(faces.map((face) => face.family).join(' ')).not.toMatch(reserved);
    }
    const ofl = readFileSync(join(fontDir, 'OFL.txt'), 'utf8');
    expect(ofl).toContain("with Reserved Font Name 'Pretendard'");
    expect(ofl).toContain('SIL Open Font License, Version 1.1');
    expect(existsSync(join(fontDir, 'FONTLOG.txt'))).toBe(true);
  });

  it('원본 2MB 글꼴은 정적 공개 경로(public/)에 두지 않는다 — 쓰지 않는 2MB 를 누구나 받게 된다', () => {
    const publicFonts = join(root, 'public/fonts');
    const big = existsSync(publicFonts)
      ? readdirSync(publicFonts).filter((name) => statSync(join(publicFonts, name)).size > 500_000)
      : [];
    expect(big).toEqual([]);
  });
});
