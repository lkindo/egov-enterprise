import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function source(...segments: string[]): string {
  return fs.readFileSync(path.resolve(process.cwd(), 'src', ...segments), 'utf8');
}

describe('P2 frontend consistency source contract', () => {
  it('mount-only hydration gate로 첫 DOM의 실제 제어를 숨기지 않는다', () => {
    const targets = [
      source('app', 'admin', 'community', 'boards', 'select-board-list', 'BoardListClient.tsx'),
      source('app', 'admin', 'community', 'boards', 'select-board-list', 'components', 'BoardListFilters.tsx'),
      source('app', 'components', 'ui', 'app-notification-drawer.tsx'),
      source('app', 'components', 'layout', 'header.tsx'),
    ];

    for (const target of targets) {
      expect(target).not.toMatch(/\b(?:mounted|isMounted|setMounted|setIsMounted)\b/);
    }
  });

  it('header 테마 아이콘은 JS mount 판정 대신 동일한 SSR DOM을 CSS로 전환한다', () => {
    const header = source('app', 'components', 'layout', 'header.tsx');

    expect(header).toContain('dark:hidden');
    expect(header).toContain('hidden dark:block');
  });

  it('scrap 화면은 API client와 query key를 직접 소유하지 않는다', () => {
    const clients = [
      source('app', 'admin', 'collaboration', 'scraps', 'selectScrapList', 'ScrapListClient.tsx'),
      source('app', 'admin', 'collaboration', 'scraps', 'selectScrapDetail', '[id]', 'SelectScrapDetailClient.tsx'),
      source('app', 'admin', 'collaboration', 'scraps', 'insertScrap', 'InsertScrapClient.tsx'),
    ];

    for (const client of clients) {
      expect(client).not.toContain("@/lib/api/client");
      expect(client).not.toMatch(/queryKey:\s*\[\s*['\"]scraps['\"]/);
    }
  });

  it('observability 화면은 fetch와 actuator query key를 직접 소유하지 않는다', () => {
    const page = source('app', 'admin', 'observability', 'page.tsx');

    expect(page).not.toMatch(/\bfetch\s*\(/);
    expect(page).not.toContain("queryKey: ['observability-actuator-metrics']");
  });

  it('comment 경계와 실제 소비 화면은 legacy any/key를 직접 소유하지 않는다', () => {
    const service = source('services', 'business', 'comment', 'commentService.ts');
    const monitoring = source('app', 'admin', 'system', 'monitoring', 'MonitoringHubClient.tsx');

    expect(service).not.toMatch(/\.get<any>/);
    expect(service).not.toMatch(/resultList|paginationInfo/);
    expect(monitoring).not.toContain("queryKey: ['admin-comments'");
    expect(monitoring).not.toContain("invalidateQueries({ queryKey: ['admin-comments']");
  });

  it('board master 경계와 소비 화면은 generated 계약·factory key를 사용한다', () => {
    const service = source('services', 'foundation', 'system', 'BoardAdminService.ts');
    const list = source('app', 'admin', 'community', 'boards', 'master', 'BoardMasterListClient.tsx');
    const options = source('hooks', 'api', 'use-board-options.ts');
    const detail = source('app', 'admin', 'community', 'boards', 'detail', 'BoardDetailClient.tsx');

    expect(service).not.toContain("@/types/modernization");
    expect(service).not.toMatch(/\bSearchParams\b|searchWrd|userId:\s*string/);
    expect(list).not.toContain("queryKey: ['boardMasters'");
    expect(options).not.toContain("queryKey: ['board-master-options']");
    expect(detail).not.toContain("queryKey: ['board-master'");
  });
});
