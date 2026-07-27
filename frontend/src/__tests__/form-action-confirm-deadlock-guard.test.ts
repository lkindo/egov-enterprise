import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 🔗 form action ↔ confirm 교착 차단 게이트 — 2026-07-27 실 결함의 재발 방지.
 *
 * **무엇을 막는가**: React 19 의 `<form action={fn}>` 핸들러 **안에서** 모달형 `confirm()` 을
 * await 하는 구조.
 *
 * **왜 위험한가**: form action 은 transition 으로 실행된다. `confirm()` 이 일으키는 모달 open
 * state 갱신은 그 transition 에 묶이므로, 액션은 모달의 응답을 기다리고 모달의 렌더는 액션이
 * 끝나야 커밋된다 — **서로를 막는 교착**이 된다.
 *
 * **실측(2026-07-27, 프로덕션 빌드, BoardDetailClient 게시글 삭제)**:
 *   - 클릭 시 액션 진입 로그는 찍히는데 `dialog` 는 0개
 *   - 3초 대기 후 재클릭도, `form.requestSubmit()` 직접 호출도 동일하게 0개
 *   - 콘솔·페이지 오류 **없음** → "눌러도 아무 일이 없는" 무증상으로만 드러난다
 *
 * 무증상이라 사람 눈으로도, 스모크 테스트로도 잡히지 않는다. 실제로 이 결함은 E2E 22티어를
 * 통과해 왔다(삭제 단계가 확인 모달을 누르지 않는 false-green 이었기 때문).
 *
 * **올바른 형태**: 확인을 transition 밖(`onClick`)에서 먼저 받고, 확정된 뒤에 서버 액션을 호출한다.
 *
 * ```tsx
 * <Button type="button" onClick={async () => {
 *   if (!(await confirm({ ... }))) return;
 *   const fd = new FormData(); fd.append('id', id);
 *   await someServerAction(null, fd);
 * }} />
 * ```
 *
 * **BASELINE 없음(0 고정)** — 이 패턴은 언제나 결함이라 동결할 정당한 잔여가 존재하지 않는다.
 */
const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');

/** 확인 모달 계열 호출 — useConfirm 의 confirm(...) 및 window.confirm(...) 모두 대상. */
const CONFIRM_CALL = /(?<![A-Za-z0-9_$.])confirm\s*\(/;

function collectFiles(dir: string): string[] {
    const out: string[] = [];
    for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (e.name === 'node_modules' || e.name === '.next' || e.name === '__tests__') continue;
        const p = join(dir, e.name);
        if (e.isDirectory()) out.push(...collectFiles(p));
        else if (/\.(tsx|jsx)$/.test(e.name) && !/\.test\./.test(e.name)) out.push(p);
    }
    return out;
}

/**
 * `action={` / `formAction={` 의 여는 중괄호부터 짝이 맞는 닫는 중괄호까지를 잘라낸다.
 * 정규식으로는 중첩 중괄호를 셀 수 없어 직접 센다(문자열·주석까지 파싱하지는 않는다 —
 * 이 게이트의 목적은 "핸들러 본문 안에 confirm 호출이 있는가" 하나뿐이라 그 정밀도로 충분하다).
 */
function extractHandlerBody(src: string, openBraceIdx: number): string | null {
    let depth = 0;
    for (let i = openBraceIdx; i < src.length; i++) {
        const ch = src[i];
        if (ch === '{') depth++;
        else if (ch === '}') {
            depth--;
            if (depth === 0) return src.slice(openBraceIdx, i + 1);
        }
    }
    return null; // 짝이 맞지 않으면(파싱 불가) 판정하지 않는다
}

/**
 * 주석을 공백으로 치환한다(줄 번호 보존을 위해 개행은 남긴다).
 * 이 게이트를 처음 돌렸을 때 유일한 위반이 **"과거엔 이랬다"고 설명하는 주석**이었다 —
 * 금지 패턴을 문서화한 주석이 그 자체로 위반이 되면 재발 방지 기록을 남길 수 없다.
 * URL 의 `//` 를 줄 주석으로 오인하지 않도록 앞에 `:` 가 오는 경우는 제외한다.
 */
function stripComments(src: string): string {
    return src
        .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
        .replace(/(^|[^:])\/\/[^\n]*/g, (_m, p1: string) => p1 + ' ');
}

function findViolations(file: string): string[] {
    const src = stripComments(readFileSync(file, 'utf8'));
    const hits: string[] = [];
    const attr = /(?<![A-Za-z0-9_$])(formAction|action)\s*=\s*\{/g;
    let m: RegExpExecArray | null;
    while ((m = attr.exec(src)) !== null) {
        const braceIdx = src.indexOf('{', m.index + m[0].length - 1);
        const body = extractHandlerBody(src, braceIdx);
        if (!body) continue;
        if (CONFIRM_CALL.test(body)) {
            const line = src.slice(0, m.index).split('\n').length;
            hits.push(`${relative(SRC, file).replace(/\\/g, '/')}:${line} (${m[1]}=)`);
        }
    }
    return hits;
}

describe('form action ↔ confirm 교착 차단', () => {
    it('form action 핸들러 안에서 confirm() 을 await 하지 않는다', () => {
        const violations = collectFiles(SRC).flatMap(findViolations);

        expect(
            violations,
            [
                'React 19 form action(transition) 안에서 confirm() 을 호출하면 모달이 열리지 않는 교착이 된다.',
                '증상은 "눌러도 아무 일이 없음"이며 콘솔 오류조차 남지 않는다.',
                '확인을 onClick 에서 먼저 받고, 확정된 뒤 서버 액션을 호출하도록 바꿀 것.',
                '',
                '위반:',
                ...violations.map((v) => `  - ${v}`),
            ].join('\n'),
        ).toEqual([]);
    });
});
