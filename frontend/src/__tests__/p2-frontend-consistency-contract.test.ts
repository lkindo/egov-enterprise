// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { inProjection } from '@/test-utils/projection';

const srcPath = (...segments: string[]) => path.resolve(process.cwd(), 'src', ...segments);

function source(...segments: string[]): string {
  return fs.readFileSync(srcPath(...segments), 'utf8');
}

// mount 전용 hydration gate 금지는 P1 계약이 src 전수 0 고정으로 본다(종전 이 파일의 손 목록 4곳은 그 안에 든다).
describe('P2 frontend consistency source contract', () => {
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
    // [2026-10-18] 대상을 옮겼다. 종전 대상 app/admin/observability/page.tsx 는 next.config 리다이렉트에 가려 실행된 적 없는
    //   화면이었고, 그 코드를 지워 이제 감시 허브로 보내는 page-redirect 스텁이다 — 스텁을 계속 읽으면 이 단언은 공허하게 통과한다.
    //   액추에이터 지표를 실제로 그리는 화면은 그 리다이렉트의 목적지인 감시 허브의 가동 상태(OBSERVABILITY) 탭이므로 같은
    //   불변식(직접 fetch·옛 query key 금지)을 그 탭의 소유 파일에 건다. 공허 통과를 막으려 쿼리 팩터리 사용도 함께 본다.
    const monitoring = source('app', 'admin', 'system', 'monitoring', 'MonitoringHubClient.tsx');

    expect(monitoring).not.toMatch(/\bfetch\s*\(/);
    expect(monitoring).not.toContain("queryKey: ['observability-actuator-metrics']");
    for (const factory of ['health', 'cpu', 'memory']) {
      expect(monitoring).toContain(`...monitoringQueryOptions.${factory}()`);
    }
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
    // [허브 분해 H6] 댓글 관리의 실제 소비 화면은 댓글 기능의 독립 화면이다. 같은 금지를 그 화면에도 둔다(댓글과 함께 빠진다).
    if (inProjection(srcPath('app', 'admin', 'system', 'comments', 'CommentModerationClient.tsx'))) {
      const moderation = source('app', 'admin', 'system', 'comments', 'CommentModerationClient.tsx');
      expect(moderation).toContain('commentQueryOptions.adminList(');
      expect(moderation).not.toContain("queryKey: ['admin-comments'");
      expect(moderation).not.toContain("invalidateQueries({ queryKey: ['admin-comments']");
    }
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
