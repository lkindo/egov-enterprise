import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTEND_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const THEMES_DIR = join(FRONTEND_DIR, 'src', 'styles', 'themes');

/**
 * 상태색 WCAG 대비 계약.
 *
 * 배경: "다크 모드에서 상태색 6종이 위반"이라는 가설로 다크 전용 값 신설이 승인됐으나,
 * 2026-08-22 실측은 반대였다 — 배지 표면 축(bg-{status} + 그 위 -foreground)은 라이트·다크
 * **모두 통과**하고, 실제 위반은 배지 전경 토큰을 다크 서피스 위 단독 텍스트로 오용한
 * 소비자 1곳(WorkflowHubClient)뿐이었다. 사람 grep 은 -foreground 매칭에 속아 사용처를
 * 과대집계했다. 그래서 이 판정을 사람 판단이 아니라 **수학 계약**으로 고정한다.
 *
 * 이 계약이 red 가 되면: 상태 토큰 값이 대비를 깨는 방향으로 바뀐 것이다. 그때의 올바른
 * 대응은 이 임계값 완화가 아니라 값 재조정이다(H2). 4.5:1 하한은 WCAG AA 라 협상 대상이 아니다.
 */

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: string, b: string): number {
  // "222.2 47.4% 4.3%" — 단위(%·deg)가 붙으므로 Number 가 아니라 parseFloat 로 읽어야 한다.
  const parse = (v: string) => v.trim().split(/\s+/).map((n) => parseFloat(n)) as [number, number, number];
  const la = relativeLuminance(hslToRgb(...parse(a)));
  const lb = relativeLuminance(hslToRgb(...parse(b)));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** 프로필 CSS의 라이트/다크 블록에서 토큰 → 값 맵을 만든다. 다크는 라이트 위에 오버레이된다. */
function readTokens(file: string): { light: Map<string, string>; dark: Map<string, string> } {
  const css = readFileSync(join(THEMES_DIR, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks = [...css.matchAll(/\{([^{}]*)\}/g)].map((m) => m[1]);
  expect(blocks.length, `${file} 에서 선언 블록을 찾지 못했습니다 — 계약이 vacuous 합니다`).toBeGreaterThanOrEqual(2);

  const toMap = (body: string) =>
    new Map([...body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)].map((m) => [m[1], m[2].trim()]));

  const light = toMap(blocks[0]);
  const dark = new Map(light);
  for (const [k, v] of toMap(blocks[1])) dark.set(k, v);
  return { light, dark };
}

const PROFILE_FILES = readdirSync(THEMES_DIR).filter(
  (name) => name.endsWith('.css') && !name.startsWith('_'),
);

const AA_TEXT = 4.5;

describe.each(PROFILE_FILES)('상태색 WCAG 대비 계약 — %s', (profileFile) => {
  const { light, dark } = readTokens(profileFile);
  const get = (map: Map<string, string>, key: string): string => {
    const value = map.get(key);
    expect(value, `${key} 가 ${profileFile} 에 정의돼 있지 않습니다`).toBeTruthy();
    return value as string;
  };

  it.each(['success', 'warning', 'info', 'destructive'] as const)(
    '배지 표면: %s 전경이 자기 배경 위에서 라이트·다크 모두 4.5:1 이상이다',
    (status) => {
      for (const [mode, tokens] of [['light', light], ['dark', dark]] as const) {
        const surface = get(tokens, `--${status}`);
        const foreground = get(tokens, `--${status}-foreground`);
        const ratio = contrast(foreground, surface);
        expect(
          ratio,
          `[${mode}] --${status}-foreground(${foreground}) on --${status}(${surface}) = ${ratio.toFixed(2)}:1 — ` +
            '배지 위 텍스트가 AA(4.5:1)를 깨뜨립니다.',
        ).toBeGreaterThanOrEqual(AA_TEXT);
      }
    },
  );

  // ⚠ 의도적으로 검사하지 않는 축 — "배지 표면 vs 페이지 배경" 경계 대비.
  //   이 계약의 초안은 그 축에 3:1 을 요구했고 현행 값 3건이 걸렸다
  //   (light warning 2.14 · light info 2.85 · dark destructive 1.99, 2026-08-22 실측).
  //   그러나 WCAG 1.4.11 은 시각 경계가 컴포넌트 **식별에 필수**인 경우에만 적용되며,
  //   내부 텍스트가 4.5:1 로 읽히는 채움형 배지는 표면-배경 경계 대비를 요구하지 않는다
  //   (W3C Understanding 1.4.11). 명세를 넘는 하한을 계약에 넣으면 출하 중인
  //   bg-warning 10곳·bg-destructive 19곳의 값을 근거 없이 바꾸는 churn 이 된다.
  //   위 실측 3건은 위반이 아니라 기록이다 — 배지를 테두리 없는 아이콘 단독 표시 등
  //   "경계가 곧 식별"인 용법으로 바꾸는 날에는 이 축을 계약으로 승격해야 한다.

  it.each(['success-emphasis', 'destructive-emphasis'] as const)(
    '단독 텍스트: %s 가 페이지 배경·카드 위에서 라이트·다크 모두 4.5:1 이상이다',
    (token) => {
      for (const [mode, tokens] of [['light', light], ['dark', dark]] as const) {
        const value = get(tokens, `--${token}`);
        for (const adjacent of ['--background', '--card'] as const) {
          const ratio = contrast(value, get(tokens, adjacent));
          expect(
            ratio,
            `[${mode}] --${token}(${value}) on ${adjacent} = ${ratio.toFixed(2)}:1 — ` +
              'emphasis 토큰은 단독 텍스트 전용이므로 페이지·카드 위에서 AA 를 만족해야 합니다.',
          ).toBeGreaterThanOrEqual(AA_TEXT);
        }
      }
    },
  );

  it('surface-inverse 위 상태 텍스트: --warning 이 고정 다크 서피스에서 4.5:1 이상이다', () => {
    // WorkflowHubClient·notification-sender 가 실제로 쓰는 조합. surface-inverse 는
    // 모드와 무관하게 어두운 고정 서피스이므로 라이트 값 기준 한 번만 검사한다.
    const ratio = contrast(get(light, '--warning'), get(light, '--surface-inverse'));
    expect(
      ratio,
      `--warning on --surface-inverse = ${ratio.toFixed(2)}:1 — 다크 서피스 위 상태 라벨이 깨집니다. ` +
        '(배지 전경 토큰 -foreground 를 이 자리에 쓰면 안 된다는 것이 2026-08-22 실결함이었다.)',
    ).toBeGreaterThanOrEqual(AA_TEXT);
  });
});
