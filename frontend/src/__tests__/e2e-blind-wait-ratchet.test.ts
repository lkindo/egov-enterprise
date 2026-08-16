import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 🔗 E2E blind wait 하향 래칫 — "시간이 지났는가"를 "무엇이 일어났는가"로 바꾸는 압력.
 *
 * `page.waitForTimeout(n)` 은 **완료 신호가 아니라 경과 시간**을 기다린다. 그래서 두 가지를 동시에
 * 만든다 — ① 부하가 걸리면 깨지는 flaky ② 실패해도 그냥 지나가는 false-green.
 *
 * 2026-07-27 하루에 이 패턴이 만든 실제 사고 3건:
 *   - 03 게시글 등록: 완료를 안 기다린 채 goto → 앱의 Server Action 을 abort(net::ERR_ABORTED),
 *     정상 저장인데도 `TypeError: Failed to fetch` 로 red. full-suite 에서만 재현되는 flaky 였다.
 *   - 05 배너 등록: 제출 후 3초 blind wait 뿐이라 **등록 실패도 그냥 지나갔다**(모달 닫힘으로 교체).
 *   - 03 게시글 삭제: 완료 미대기 + 확인 모달 미클릭 → 삭제가 한 번도 실행되지 않았는데 통과.
 *     이 false-green 이 "삭제가 아예 동작하지 않는" 앱 결함을 22티어 내내 덮고 있었다.
 *
 * **전량 치환은 하지 않는다.** 남은 호출부는 의미가 제각각이라(모달 진입 애니메이션 정착, 디바운스,
 * 자동 임시저장 타이머 발화 대기, VRT 직전 차트 애니메이션 등) 일괄 sweep 은 의미 차이를 지운다
 * (GEMINI.md §0.7-H4). 대신 **현 census 를 동결하고 증가만 차단**한다 — 새 코드는 완료 신호를
 * 기다려야 하고, 기존 것은 만질 때마다 하나씩 줄인다.
 *
 * 줄이는 방향의 정답은 대개 이렇다:
 *   - 저장/삭제 후  → URL 전환 또는 모달 닫힘 또는 toast(버튼과 구분되는 컨테이너 한정)를 기다린다
 *   - 목록 갱신 후  → 기대 행이 보일 때까지 기다린다(`expect(...).toBeVisible()`)
 *   - 애니메이션    → 정착 상태를 강제하거나(`addStyleTag`) 최종 상태를 단언한다
 */
const E2E_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'e2e');

/**
 * [동결 2026-07-27] 최초 census 69 에서 PromotionPage.clickSubmitAndWait 의 3초 blind wait 을
 * 모달 닫힘 대기로 교체해 68. 방향은 **감소만** 허용한다.
 *
 * [하향 2026-08-10: 68 → 63] E2E 최적화 감사의 부산물이다. 대기를 직접 손댄 것이 아니라,
 *   **E2E 전용 타입 게이트(tsconfig.e2e.json)를 신설하자 호출부가 0인 死메서드 2개가 검출됐고**
 *   (`SurveyPage.selectDate` · `SurveyPage.ensurePopoverClosed`), 그 안에 blind wait 5개가
 *   들어 있었다. 죽은 코드를 지우니 census 가 함께 내려간 것이다.
 *   종전에는 루트 tsconfig 가 `e2e` 를 exclude 해 이런 선언이 영구히 보이지 않았다.
 *
 *   ⚠ 하향은 이 래칫의 **설계된 동작**이다(아래 두 번째 테스트가 강제한다). 상향이라면 은폐지만,
 *     개선분을 확정하지 않으면 되돌아갈 여지를 남겨 래칫이 이름만 남는다.
 *   남은 호출은 여전히 의미가 제각각이라 일괄 치환하지 않는다(§0.7-H4). 인프라가 복구되면
 *   실행 검증과 함께 하나씩 줄인다.
 *
 * [하향 2026-08-13: 63 → 62] SearchPage 의 검색 완료를 고정 1.5초가 아니라
 *   URL 의 q 파라미터 반영으로 기다리도록 바꿨다. 빠른 입력과 PPR hydration 의 경합을
 *   재현하는 테스트 강도는 유지하면서 불필요한 시간 의존 1건을 제거했다.
 *
 * [하향 2026-08-16: 62 → 61] MailPage 수신자 추가 완료를 고정 1초가 아니라
 *   선택된 수신자 배지가 표시되는 상태로 기다리도록 바꿨다.
 */
const BASELINE = 61;

function collectFiles(dir: string): string[] {
    const out: string[] = [];
    if (!existsSync(dir)) return out;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (e.name === 'node_modules' || e.name === 'test-results' || e.name === '.auth') continue;
        const p = join(dir, e.name);
        if (e.isDirectory()) out.push(...collectFiles(p));
        else if (/\.ts$/.test(e.name)) out.push(p);
    }
    return out;
}

describe('E2E blind wait 하향 래칫', () => {
    it(`waitForTimeout 총계가 동결선(${BASELINE})을 넘지 않는다`, () => {
        const perFile: Array<{ file: string; count: number }> = [];
        let total = 0;

        for (const f of collectFiles(E2E_DIR)) {
            const n = (readFileSync(f, 'utf8').match(/waitForTimeout\s*\(/g) ?? []).length;
            if (n > 0) {
                perFile.push({ file: relative(E2E_DIR, f).replace(/\\/g, '/'), count: n });
                total += n;
            }
        }

        expect(
            total,
            [
                `waitForTimeout 총계가 ${total} 로 동결선 ${BASELINE} 을 넘었다.`,
                '새 대기는 "시간"이 아니라 "완료 신호"를 기다리도록 작성할 것',
                '(URL 전환 / 모달 닫힘 / 기대 요소 표시 / toast 컨테이너 한정).',
                '',
                '분포:',
                ...perFile.sort((a, b) => b.count - a.count).map((x) => `  ${x.count}  ${x.file}`),
            ].join('\n'),
        ).toBeLessThanOrEqual(BASELINE);
    });

    it('동결선이 실제 census 보다 느슨하게 방치되지 않는다(하향 래칫)', () => {
        let total = 0;
        for (const f of collectFiles(E2E_DIR)) {
            total += (readFileSync(f, 'utf8').match(/waitForTimeout\s*\(/g) ?? []).length;
        }
        // 실제 개수가 동결선보다 작아졌으면 BASELINE 을 그 값으로 내려야 한다.
        // 내리지 않으면 다시 늘어날 여지를 남기게 되고, 래칫이 이름만 남는다.
        expect(
            total,
            total < BASELINE
                ? `실제 census(${total})가 동결선(${BASELINE})보다 작다 — 개선분을 확정하려면 BASELINE 을 ${total} 로 내릴 것(하향 래칫).`
                : `실제 census(${total})가 동결선(${BASELINE})을 초과했다 — 새 대기는 완료 신호를 기다리도록 작성할 것.`,
        ).toBe(BASELINE);
    });
});
