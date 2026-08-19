import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTEND_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function filesEndingWith(directory: string, suffix: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return filesEndingWith(path, suffix);
    return entry.name.endsWith(suffix) ? [path] : [];
  });
}

function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\n)\s*\/\/[^\n]*/g, '$1');
}

describe('E2E harness dead-asset contract', () => {
  it('소비자가 없는 POM/fixture를 다시 싣지 않는다', () => {
    const removedAssets = [
      'e2e/pages/BBSPage.ts',
      'e2e/pages/UserAdminPage.ts',
      'e2e/fixtures/self-healing-agent.ts',
      'e2e/fixtures/layout-breathing-guard.ts',
    ];

    expect(removedAssets.filter((asset) => existsSync(join(FRONTEND_DIR, asset)))).toEqual([]);

    const baseFixture = readFileSync(join(FRONTEND_DIR, 'e2e/fixtures/base-test.ts'), 'utf8');
    expect(baseFixture).not.toMatch(/\b(?:BBSPage|UserAdminPage|SelfHealingAgent|LayoutBreathingGuard)\b/);
    expect(baseFixture).not.toMatch(/\b(?:bbsPage|userAdminPage|healingAgent|layoutGuard)\s*:/);
  });

  it('E2E skip은 플랫폼 한정 visual baseline 한 건만 허용한다', () => {
    const usages = filesEndingWith(join(FRONTEND_DIR, 'e2e'), '.spec.ts').flatMap(path => {
      const source = withoutComments(readFileSync(path, 'utf8'));
      const forbiddenCall = new RegExp(`\\btest(?:\\.describe)?\\s*\\.\\s*(?:${['sk', 'ip'].join('')}|fixme|fail|only)\\s*\\(`, 'g');
      return [...source.matchAll(forbiddenCall)].map(match => ({
        file: path.slice(FRONTEND_DIR.length + 1).replaceAll('\\', '/'),
        call: match[0].replace(/\s+/g, ''),
      }));
    });

    expect(usages).toEqual([{
      file: 'e2e/04-quality-resilience.spec.ts',
      call: ['test', 'skip('].join('.'),
    }]);
    const visualSpec = readFileSync(join(FRONTEND_DIR, 'e2e/04-quality-resilience.spec.ts'), 'utf8');
    expect(visualSpec).toContain("process.platform !== 'linux'");
    expect(visualSpec).toContain('비주얼 회귀는 CI(리눅스) 전용이다');
  });
});
