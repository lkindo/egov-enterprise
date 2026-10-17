// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { codeWithoutComments, productionSourceFiles } from '../../../scripts/code-without-comments.mjs';

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

/**
 * `action={` / `formAction={` 의 여는 중괄호부터 짝이 맞는 닫는 중괄호까지를 잘라낸다.
 * 정규식으로는 중첩 중괄호를 셀 수 없어 직접 센다(문자열까지 파싱하지는 않는다 —
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
 * 한 파일에서 핸들러 본문에 confirm 호출이 있는 `action=`·`formAction=` 의 줄 번호(1부터).
 *
 * 주석은 세지 않는다. 이 게이트를 처음 돌렸을 때 유일한 위반이 **"과거엔 이랬다"고 설명하는 주석**이었다 —
 * 금지 패턴을 문서화한 주석이 그 자체로 위반이 되면 재발 방지 기록을 남길 수 없다.
 * 주석 제거는 공용 판정(scripts/code-without-comments.mjs)이 한다. 주석을 같은 길이 공백으로 바꾸므로 줄 번호가 원문과 같다.
 * 종전 정규식 제거는 문자열 속 주석 기호에서 블록 주석을 열어 그 뒤 코드를 통째로 지웠고, 그 구간에 교착 핸들러를
 * 넣어도 녹색이었다(FE-CONTRACT-01).
 */
function violationLines(source: string, fileName: string): number[] {
    const src = codeWithoutComments(source, fileName);
    const lines: number[] = [];
    const attr = /(?<![A-Za-z0-9_$])(formAction|action)\s*=\s*\{/g;
    let m: RegExpExecArray | null;
    while ((m = attr.exec(src)) !== null) {
        const braceIdx = src.indexOf('{', m.index + m[0].length - 1);
        const body = extractHandlerBody(src, braceIdx);
        if (!body) continue;
        if (CONFIRM_CALL.test(body)) lines.push(src.slice(0, m.index).split('\n').length);
    }
    return lines;
}

describe('form action ↔ confirm 교착 차단', () => {
    it('form action 핸들러 안에서 confirm() 을 await 하지 않는다', () => {
        const files = productionSourceFiles(SRC, ['.tsx', '.jsx']);
        expect(files.length, '생산 소스를 찾지 못했다 — 가드가 공허하다').toBeGreaterThan(50);
        const violations = files.flatMap((file) => violationLines(readFileSync(file, 'utf8'), file)
            .map((line) => `${relative(SRC, file).replace(/\\/g, '/')}:${line}`));

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

    it('문자열 속 주석 기호 뒤의 핸들러도 잡고 주석 속 언급은 세지 않는다', () => {
        // 실측 모양(FE-CONTRACT-01): 파일 업로더의 accept 값 '*/*'·'image/*' 뒤, JSX 블록 주석 앞에 넣은 핸들러를 종전 정규식 제거가
        //   통째로 지워 놓쳤다. 넷째 줄이 잡혀야 하고 마지막 줄(주석)은 세지 않는다.
        const source = [
            "const accept = '*/*';",
            "const images = ['image/*'];",
            'export const View = () => (',
            "    <form action={async () => { if (!(await confirm({ title: 'x' }))) return; }}>",
            '        {/* Drop Zone */}',
            '    </form>',
            ');',
            "// <form action={async () => { await confirm({ title: '주석 속 언급' }); }}>",
        ].join('\n');
        expect(violationLines(source, 'standard-file-uploader.tsx')).toEqual([4]);
    });
});
