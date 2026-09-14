import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { projectFrontendPackMarkers } from './generate-reusable-base-source.mjs';

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
