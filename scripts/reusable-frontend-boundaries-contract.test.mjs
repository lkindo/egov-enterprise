import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { projectFrontendPackMarkers } from './reusable-source-frontend.mjs';

const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const ts = require('typescript');
const manifest = JSON.parse(readFileSync(new URL('../config/reusable-base-profiles.json', import.meta.url), 'utf8'));
const paths = {
  search: 'frontend/src/app/search/SearchClient.tsx',
  monitoring: 'frontend/src/app/admin/system/monitoring/MonitoringHubClient.tsx',
  maker: 'frontend/src/app/admin/community/boards/maker/components/BoardMakerWizard.tsx',
};
const sources = Object.fromEntries(Object.entries(paths).map(([key, path]) => [key, readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')]));

function projected(source, profile, label) {
  const result = projectFrontendPackMarkers(source, {
    knownPacks: new Set(Object.keys(manifest.packs)),
    excludedPacks: new Set(Object.keys(manifest.packs).filter(pack => !manifest.profiles[profile].packs.includes(pack))),
    label,
  });
  const compiled = ts.transpileModule(result.source, {
    fileName: label,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, removeComments: true, verbatimModuleSyntax: true },
    reportDiagnostics: true,
  });
  assert.deepEqual(compiled.diagnostics.filter(row => row.category === ts.DiagnosticCategory.Error), [], label);
  return compiled.outputText;
}

function boundaryErrors(source, profile, feature) {
  const text = projected(source, profile, paths[feature]);
  const errors = [];
  if (feature === 'search') {
    if (!text.includes('userSearchService.searchAssignableUsers(query)') || !text.includes('menuService.getHeadMenus()')) errors.push('core search was removed');
    if (profile === 'core' && /boardUserService|ArticleResultItem|ArrowRight|MessageSquare|id: ['"]articles['"]/.test(text)) errors.push('excluded board search leaked into core');
    if (profile !== 'core' && !text.includes('boardUserService.searchPosts(query)')) errors.push('included board search was removed');
  }
  if (feature === 'monitoring') {
    for (const call of ['auditAdminService.getAuditLogs', 'systemLogAdminService.getSystemLogs', 'systemLogAdminService.getLoginLogs']) {
      if (!text.includes(call)) errors.push(`core monitoring was removed: ${call}`);
    }
    if (profile === 'core' && /commentQueryOptions|commentMutationOptions|handleDeleteComment|useRef|useMutation|MessageSquare|Trash2|useToast|useConfirm|tab: ['"]COMMENTS['"]/.test(text)) errors.push('excluded comments leaked into core');
    if (profile !== 'core' && (!text.includes('commentMutationOptions.removeAdmin') || !text.includes('await confirm('))) errors.push('included comment deletion lost its control');
  }
  if (feature === 'maker') {
    if (!text.includes('boardAdminService.createBoardMaster(') || !text.includes('menuAdminService.createMenu(')) errors.push('included board creation was removed');
    if (profile !== 'demo' && /communityUserService|communityOptions|htmlFor: ['"]cmntySn['"]/.test(text)) errors.push('excluded community ownership leaked into collaboration');
    if (profile === 'demo' && !text.includes('communityUserService.getCommunityList(')) errors.push('included community selection was removed');
  }
  return errors;
}

for (const profile of ['core', 'collaboration', 'demo']) {
  test(`${profile} retains shared UI and includes optional axes only with their declared packs`, () => {
    for (const [feature, source] of Object.entries(sources)) {
      // The maker belongs to collaboration; its internal demo boundary is checked here
      // even for core as a syntax fixture, while the artifact route inventory rejects it in core.
      assert.deepEqual(boundaryErrors(source, profile, feature), [], feature);
    }
  });
}

/*
 * 화면의 라우트 종류(page·리다이렉트)는 page 파일 본문의 redirect 호출·return 과 next.config 선언으로 판정한다. 마커 블록이 그
 * 근거를 품으면 종류가 프로필마다 갈려, 원본 원장으로 계산한 화면 생존 기대값과 투영 뒤 본문을 보는 거버넌스 투영이 어긋난다.
 */
test('a page marker block cannot carry a redirect call or a return, and next.config cannot carry markers', () => {
  const options = { knownPacks: new Set(Object.keys(manifest.packs)), excludedPacks: new Set(['demo']) };
  const block = body => `export default function Page() {\n  // reusable-base:demo:start\n${body}\n  // reusable-base:demo:end\n  return null;\n}\n`;
  for (const body of ["  redirect('/x');", '  return <Demo />;']) {
    for (const label of ['src/app/demo/page.tsx', 'frontend/src/app/demo/page.tsx']) {
      assert.throws(() => projectFrontendPackMarkers(block(body), { ...options, label }), /page 파일의 pack 마커 블록은 redirect 호출이나 return 을 품을 수 없다/);
    }
  }
  // 남기는 블록이어도 같다 — 프로필마다 갈리는 것이 문제다.
  assert.throws(() => projectFrontendPackMarkers(block("  redirect('/x');"), { ...options, excludedPacks: new Set(), label: 'src/app/demo/page.tsx' }),
    /redirect 호출이나 return/);
  // 대조군: 주석 속 return, page 가 아닌 파일, 근거가 없는 블록은 통과한다.
  assert.doesNotThrow(() => projectFrontendPackMarkers(block('  // return later'), { ...options, label: 'src/app/demo/page.tsx' }));
  assert.doesNotThrow(() => projectFrontendPackMarkers(block("  redirect('/x');"), { ...options, label: 'src/app/demo/DemoClient.tsx' }));
  assert.doesNotThrow(() => projectFrontendPackMarkers(block('  const x = 1;'), { ...options, label: 'src/app/demo/page.tsx' }));
  // next.config 의 리다이렉트 선언은 거버넌스 투영이 정리하므로 마커를 두지 않는다.
  assert.throws(() => projectFrontendPackMarkers(block('  const x = 1;'), { ...options, label: 'next.config.ts' }), /next\.config 는 pack 마커를 둘 수 없다/);
});

test('unscoped optional imports and removed shared service calls are reproducible reds', () => {
  const importLeak = sources.search.replace('/* reusable-base:collaboration:start */', '').replace('/* reusable-base:collaboration:end */', '');
  assert.match(boundaryErrors(importLeak, 'core', 'search').join('\n'), /excluded board search/);
  const deletedCoreSearch = sources.search.replace('userSearchService.searchAssignableUsers(query)', 'Promise.resolve([])');
  assert.match(boundaryErrors(deletedCoreSearch, 'core', 'search').join('\n'), /core search was removed/);
  const missingConfirmation = sources.monitoring.replace('await confirm(', 'await uncheckedConfirmation(');
  assert.match(boundaryErrors(missingConfirmation, 'collaboration', 'monitoring').join('\n'), /lost its control/);
  const leakedCommentHook = `${sources.monitoring}\nconst toast = useToast();\n`;
  assert.match(boundaryErrors(leakedCommentHook, 'core', 'monitoring').join('\n'), /excluded comments/);
});
