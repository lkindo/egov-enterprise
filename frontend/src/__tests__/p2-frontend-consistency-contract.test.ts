import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { inProjection, keepInProjection } from '@/test-utils/projection';

const srcPath = (...segments: string[]) => path.resolve(process.cwd(), 'src', ...segments);

function source(...segments: string[]): string {
  return fs.readFileSync(srcPath(...segments), 'utf8');
}

// 선택하지 않은 기능의 파일은 생성물에서 투영으로 빠진다 — 원장에 있고 실제로 없는 파일만 뺀다(원본에서는 그대로다).
const present = (files: string[][]) => keepInProjection(files, segments => srcPath(...segments));

describe('P2 frontend consistency source contract', () => {
  it('mount-only hydration gate로 첫 DOM의 실제 제어를 숨기지 않는다', () => {
    const targets = present([
      ['app', 'admin', 'community', 'boards', 'select-board-list', 'BoardListClient.tsx'],
      ['app', 'admin', 'community', 'boards', 'select-board-list', 'components', 'BoardListFilters.tsx'],
      ['app', 'components', 'ui', 'app-notification-drawer.tsx'],
      ['app', 'components', 'layout', 'header.tsx'],
    ]).map(segments => source(...segments));

    for (const target of targets) {
      expect(target).not.toMatch(/\b(?:mounted|isMounted|setMounted|setIsMounted)\b/);
    }
  });

  it('header 테마 아이콘은 JS mount 판정 대신 동일한 SSR DOM을 CSS로 전환한다', () => {
    const header = source('app', 'components', 'layout', 'header.tsx');

    expect(header).toContain('dark:hidden');
    expect(header).toContain('hidden dark:block');
  });

  if (inProjection(srcPath('app', 'admin', 'collaboration', 'scraps', 'ScrapFormDialog.tsx'))) it('scrap 화면은 API client와 query key를 직접 소유하지 않는다', () => {
    const clients = [
      source('app', 'admin', 'collaboration', 'scraps', 'selectScrapList', 'ScrapListClient.tsx'),
      // [2026-09-12 §A3-1] 등록·수정 전용 페이지 2개가 목록 위 모달 하나로 합쳐졌다.
      source('app', 'admin', 'collaboration', 'scraps', 'ScrapFormDialog.tsx'),
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
    const monitoring = source('app', 'admin', 'system', 'monitoring', 'MonitoringHubClient.tsx');

    // 댓글(게시판 위의 별도 선택 기능)이 빠지면 서비스가 없다. 감시 화면의 댓글 키 금지는 기능과 무관하게 본다.
    if (inProjection(srcPath('services', 'business', 'comment', 'commentService.ts'))) {
      const service = source('services', 'business', 'comment', 'commentService.ts');
      expect(service).not.toMatch(/\.get<any>/);
      expect(service).not.toMatch(/resultList|paginationInfo/);
    }
    expect(monitoring).not.toContain("queryKey: ['admin-comments'");
    expect(monitoring).not.toContain("invalidateQueries({ queryKey: ['admin-comments']");
  });

  if (inProjection(srcPath('services', 'foundation', 'system', 'BoardAdminService.ts'))) it('board master 경계와 소비 화면은 generated 계약·factory key를 사용한다', () => {
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
