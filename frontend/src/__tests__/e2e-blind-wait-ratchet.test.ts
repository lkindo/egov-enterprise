import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 고정 시간 대기는 완료 신호가 아니므로 E2E 제품 코드에서 금지한다.
 * URL·응답·locator·접근성 상태·저장 상태처럼 사용자가 관찰할 수 있는 신호를 기다려야 한다.
 * 정말 시간 자체가 계약인 rate-limit/animation 시나리오가 생기면 raw 호출을 넣지 말고,
 * 사유와 상한을 강제하는 별도 helper 및 그 helper의 계약 테스트를 함께 추가한다.
 */
const E2E_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'e2e');

function collectTypeScriptFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules' || entry.name === 'test-results' || entry.name === '.auth') return [];
    const file = join(directory, entry.name);
    return entry.isDirectory() ? collectTypeScriptFiles(file) : /\.ts$/.test(entry.name) ? [file] : [];
  });
}

describe('E2E raw wait 금지 래칫', () => {
  it('waitForTimeout을 직접 호출하지 않는다', () => {
    const offenders = collectTypeScriptFiles(E2E_DIR).flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      return [...source.matchAll(/\.\s*waitForTimeout\s*\(/g)].map((match) => ({
        file: relative(E2E_DIR, file).replace(/\\/g, '/'),
        line: source.slice(0, match.index).split('\n').length,
      }));
    });

    expect(
      offenders,
      [
        'raw waitForTimeout은 완료 신호를 증명하지 못한다.',
        'URL/response/locator/state 기반 대기로 교체할 것:',
        ...offenders.map(({ file, line }) => `  ${file}:${line}`),
      ].join('\n'),
    ).toEqual([]);
  });
});
