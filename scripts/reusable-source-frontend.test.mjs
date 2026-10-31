import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createFrontendProjector } from './reusable-source-frontend.mjs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('template-only composition removes the board preview link and its permission tests', () => {
  const files = [
    'src/app/admin/community/templates/TemplateAdminClient.tsx',
    'src/app/admin/community/templates/__tests__/TemplateAdminClient.test.tsx',
  ];
  for (const selected of [false, true]) {
    const composition = { resolvedDomains: selected ? ['template', 'board'] : ['template'], frontend: { removePaths: [] } };
    const projector = createFrontendProjector({ composition, files });
    for (const file of files) {
      const source = readFileSync(join(ROOT, 'frontend', file), 'utf8');
      const projected = projector.project(file, source).source;
      assert.equal(projected.includes('/admin/community/boards/maker'), selected, file);
      assert.equal(projected.includes('게시판 만들기에서 화면 유형 확인'), selected, file);
      assert.ok(projected.includes('templateAdminService'), 'template CRUD remains');
    }
  }
});

/*
 * 마커 선언은 projector 마다 읽는다(트랙 C 검토). 오래 도는 생성기 화면 서버(project:ui)는 정밀 점검마다 카탈로그를 다시 적재하는데,
 * 선언을 프로세스에 한 번만 두면 pull 로 블록 선언이 바뀐 뒤에도 옛 선언으로 판정해 정밀 점검이 'Unclassified composer UI block' 으로
 * 막힌다(생성은 자식 프로세스라 영향이 없다). 선언은 스크립트가 속한 저장소에서 읽으므로, 스크립트와 기능 파일을 임시 저장소로 복사해
 * 같은 프로세스에서 선언을 바꾼 뒤 새 projector 가 그것을 보는지 확인한다.
 */
test('a new frontend projector reads the marker declarations that are current when it projects', async (t) => {
  const root = mkdtempSync(join(resolve(tmpdir()), 'egov-frontend-projector-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  cpSync(join(ROOT, 'scripts'), join(root, 'scripts'), { recursive: true });
  cpSync(join(ROOT, 'config/modules'), join(root, 'config/modules'), { recursive: true });
  const { createFrontendProjector } = await import(pathToFileURL(join(root, 'scripts/reusable-source-frontend.mjs')).href);
  const composition = { resolvedDomains: ['board'], frontend: { removePaths: [] } };
  const file = 'src/app/projector-probe/page.tsx';
  const source = 'export default function Page() {\n  /* reusable-base:board:start */\n  const board = 1;\n  /* reusable-base:board:end */\n  return null;\n}\n';
  const project = () => createFrontendProjector({ composition, files: [file] }).project(file, source);
  assert.throws(project, /Unclassified composer UI block: src\/app\/projector-probe\/page\.tsx\/board/, 'an undeclared block is refused');
  // 같은 프로세스에서 기능 파일에 선언을 더한다(pull 이 선언을 바꾼 자리). 새 projector 는 바뀐 선언으로 판정한다.
  const boardFile = join(root, 'config/modules/board.json');
  const board = JSON.parse(readFileSync(boardFile, 'utf8'));
  board.owns.markerBlocks.push({ file, blocks: 1, step: '시험용', reason: '시험용 선언이다.' });
  writeFileSync(boardFile, JSON.stringify(board));
  assert.equal(project().source, source, 'a projector created after the declaration change keeps the declared block of a selected feature');
});
