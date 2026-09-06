import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 🚫 네이티브 `confirm()` 재유입 차단 게이트 (DEC-OPS-038, 감사 D06-03).
 *
 * 저장소는 확인 대화를 `useConfirm` 모달로 통일했다 — 문구·키보드·보조기술 동작이 화면마다 갈리지 않게 하기
 * 위해서다. 2026-09-06 에 마지막 네이티브 호출 3곳(댓글 삭제·부서 일정 삭제·설문 응답 삭제)을 옮겼고, 이 게이트는
 * 그 상태를 0 으로 동결한다.
 *
 * 판정: `window.confirm(` 또는 첫 인자가 문자열 리터럴인 `confirm(` 호출 — 네이티브 시그니처는 문자열 하나를
 * 받고, `useConfirm` 의 confirm 은 옵션 객체(`confirm({ title, message, ... })`)를 받으므로 이것으로 갈린다.
 * 주석 안의 언급은 대상이 아니다(라인 주석·블록 주석을 먼저 벗긴다).
 *
 * **BASELINE 없음(0 고정)** — 네이티브 확인창은 언제나 이행 대상이라 동결할 정당한 잔여가 없다.
 */
const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');

const NATIVE_CONFIRM = /(?:\bwindow\.confirm\s*\(|(?<![\w$.])confirm\s*\(\s*[`'"])/;

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
}

function collectFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '__tests__') continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectFiles(path));
    else if (/\.(tsx|ts|jsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) out.push(path);
  }
  return out;
}

describe('native confirm guard', () => {
  it('src 에 네이티브 confirm() 호출이 없다 — 확인 대화는 useConfirm 모달 하나다', () => {
    const offenders: string[] = [];
    for (const file of collectFiles(SRC)) {
      const source = stripComments(readFileSync(file, 'utf8'));
      const lines = source.split('\n');
      lines.forEach((line, index) => {
        if (NATIVE_CONFIRM.test(line)) offenders.push(`${relative(SRC, file)}:${index + 1}`);
      });
    }
    expect(
      offenders,
      '네이티브 confirm() 이 다시 들어왔습니다. useConfirm({ title, message, confirmText, variant }) 로 옮기세요.',
    ).toEqual([]);
  });
});
