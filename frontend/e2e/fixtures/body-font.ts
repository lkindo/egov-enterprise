import fs from 'fs';
import path from 'path';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * 본문 글꼴(Nuri Sans) 조각을 이 브라우저 컨텍스트의 캐시에 모두 받아 둔다.
 *
 * [2026-11-15] 본문 글꼴은 font-display: optional 이다 — 짧은 대기 시간 안에 오지 않은 조각은 그 페이지에서 쓰지 않고
 * 대체 글꼴로 그린다. 2MB 한 벌일 때는 CI 에서 거의 늘 늦어 기준선이 대체 글꼴로 찍혔고, 조각이 작아지자 제때 올 때와
 * 늦을 때가 갈려 같은 화면이 두 글꼴로 찍혔다(PR #1107 run 43720656740: 첫 시도 Nuri Sans, 재시도 대체 글꼴).
 * 캐시에 있는 조각은 대기 시간 안에 쓰이므로, 예열한 뒤 다시 연 화면은 늘 디자인 글꼴로 그려진다.
 * 컨텍스트마다 캐시가 따로이므로 컨텍스트마다 한 번 부른다. 앱 CSS 의 @font-face 가 필요하므로 앱 화면을 연 뒤 부른다.
 */
export async function warmBodyFontCache(page: Page): Promise<void> {
    const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'fonts', 'nuri-sans.manifest.json'), 'utf-8')) as {
        slices: Array<{ name: string; glyphRange: string }>;
    };
    // 조각마다 담은 글자 하나 — 공백·제어 문자는 글꼴 받기를 일으키지 않을 수 있어 그보다 큰 첫 글자를 고른다.
    const sample = manifest.slices.map(({ glyphRange }) => {
        const first = glyphRange.split(',')
            .map((part) => /U\+([0-9A-F]+)(?:-([0-9A-F]+))?/.exec(part)!)
            .map((match) => [parseInt(match[1], 16), parseInt(match[2] ?? match[1], 16)] as const)
            .map(([lo, hi]) => (lo > 0x20 ? lo : hi > 0x20 ? 0x21 : -1))
            .find((cp) => cp > 0x20);
        return String.fromCodePoint(first!);
    }).join('');
    const statuses = await page.evaluate(async (text) => {
        const faces = await document.fonts.load('400 16px "Nuri Sans"', text);
        return faces.map((face) => face.status);
    }, sample);
    expect(statuses, '본문 글꼴 조각을 모두 받아 와야 한다').toEqual(manifest.slices.map(() => 'loaded'));
}
