import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');

function source(relativePath: string): string {
  return readFileSync(join(SRC, relativePath), 'utf8');
}

describe('r6 accessibility regressions', () => {
  it('makes the bounded user-result scroller keyboard reachable and named', () => {
    const userHub = source('app/admin/user/UserOrgHubClient.tsx');

    expect(userHub).toContain("aria-label={activeTab === 'DEPTS' ? '부서 조직 구조' : '조직·사용자 결과 스크롤 영역'}");
    expect(userHub).toMatch(/role="region"[\s\S]*tabIndex=\{0\}[\s\S]*overflow-y-auto[^\"]*focus-visible:ring-2/);
  });

  it('does not dim repeated user identifiers or the empty-selection heading below the muted token', () => {
    const userHub = source('app/admin/user/UserOrgHubClient.tsx');

    expect(userHub).not.toContain('text-[10px] font-bold tracking-tight opacity-60');
    expect(userHub).not.toContain('text-3xl font-black text-muted-foreground/50 tracking-tighter');
    expect(userHub).toContain('text-3xl font-black text-muted-foreground tracking-tighter');
  });

  it('keeps FAQ labels on full-strength semantic foreground tokens', () => {
    const help = source('app/help/HelpClient.tsx');

    expect(help).toContain('text-primary text-3xl');
    expect(help).not.toContain('text-primary opacity-30 text-3xl');
    expect(help).not.toContain('text-muted-foreground/60 hover:text-foreground');
    expect(help).toContain('text-muted-foreground hover:text-foreground');
  });

  it('uses the theme-aware success emphasis token for the audit status label', () => {
    const timeline = source('app/components/ui/visual-audit-timeline.tsx');

    expect(timeline).toContain('text-success-emphasis tracking-tight');
    expect(timeline).not.toContain('text-emerald-700 tracking-tight');
  });

  it('keeps A2 aria-current selection visible in Windows forced-colors mode', () => {
    const globals = source('app/globals.css');
    const forcedColors = globals.match(/@media \(forced-colors: active\) \{[\s\S]*?\n  \}/)?.[0] ?? '';

    expect(forcedColors).toContain('[aria-current="true"]');
    expect(forcedColors).toMatch(/\[aria-current="true"\][\s\S]*outline:\s*2px solid Highlight/);
  });
});
