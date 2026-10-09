import assert from 'node:assert/strict';
import test from 'node:test';
import { resolve } from 'node:path';
import { canonicalJson, compositionDigest, loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { CAPABILITY_SUMMARIES, COMPOSER_AREAS, PRESET_LABELS, composerPresentation, loadRouteKinds } from './project-composer-presentation.mjs';
import { createComposerEngine } from './project-composer.mjs';

const root = resolve(import.meta.dirname, '..');
const catalog = loadProjectComposerCatalog(root);
const routeKinds = loadRouteKinds(root);
const present = (options = {}) => composerPresentation(catalog, { routeKinds, ...options });

/*
 * 생성기 화면의 표시 문구(설계서 14.1·E3·E9). 영역·요약·시작 구성 이름은 실제 카탈로그와 정확히 대응해야 하고,
 * 카탈로그 해시 밖에 있어 문구를 고쳐도 구성 해시가 바뀌지 않는다. 화면 문구의 원천은 이 모듈 하나다.
 */
test('every capability sits in exactly one area with one summary, and every preset has a Korean name', () => {
  const presentation = present();
  const placed = presentation.areas.flatMap(area => area.domains);
  assert.deepEqual([...placed].sort(), catalog.capabilities.map(capability => capability.id).sort());
  assert.equal(new Set(placed).size, placed.length);
  assert.deepEqual(Object.keys(presentation.summaries).sort(), catalog.capabilities.map(capability => capability.id).sort());
  assert.deepEqual(Object.keys(presentation.presets).sort(), catalog.presets.map(preset => preset.id).sort());
  for (const text of [...presentation.areas.map(area => area.label), ...Object.values(presentation.summaries), ...Object.values(presentation.presets).map(preset => preset.label)]) {
    assert.doesNotMatch(text, /[A-Za-z]/, text);
  }
  // 화면 문구는 카탈로그 본문에 두 번째 원천을 두지 않는다. 종전의 고정 설명은 테이블 0개인 기능에도 'DB'를 말했다.
  assert.ok(catalog.capabilities.every(capability => !Object.hasOwn(capability, 'description')));
  assert.ok(catalog.presets.every(preset => !Object.hasOwn(preset, 'label') && !Object.hasOwn(preset, 'description')));
});

test('presentation copy stays outside the catalog hash, so copy edits never change composition hashes', () => {
  const engine = createComposerEngine({ root }).catalog();
  const presentation = present();
  assert.deepEqual(engine.presentation, presentation);
  // 해시가 덮는 본문에 표시 문구가 없어야 문구 수정이 해시를 바꾸지 않는다. 키 구성을 허용 목록과 정확히 비교하고,
  // 요약·시작 구성 이름 문자열이 본문 어디에도 없는지 본다(짧은 영역 이름은 개발자 근거 문장과 우연히 겹칠 수 있어 키로만 본다).
  const { catalogHash, ...body } = catalog;
  assert.equal(compositionDigest(body), catalogHash);
  assert.ok(!['presentation', 'areas', 'summaries', 'screens'].some(key => Object.hasOwn(body, key)));
  for (const capability of body.capabilities) {
    assert.deepEqual(Object.keys(capability).sort(), ['available', 'backend', 'database', 'frontend', 'id', 'label', 'menuRoutes', 'menuTabs', 'pack',
      'permissionCodes', 'requirements', 'requires'], capability.id);
  }
  for (const preset of body.presets) assert.deepEqual(Object.keys(preset).sort(), ['domains', 'frontendRemovePaths', 'id', 'packs'], preset.id);
  const hashed = canonicalJson(body);
  for (const text of [...Object.values(presentation.summaries), ...Object.values(presentation.presets).map(preset => preset.label)]) {
    assert.ok(!hashed.includes(text), `hashed catalog body carries presentation copy: ${text}`);
  }
  // 문구만 바꾼 표시 문구도 같은 카탈로그와 짝을 이룬다.
  assert.equal(present({ summaries: { ...CAPABILITY_SUMMARIES, mail: '메일 보내기' } }).summaries.mail, '메일 보내기');
  assert.equal(loadProjectComposerCatalog(root).catalogHash, catalogHash);
});

test('the screen badge counts only real pages from the route census, never redirect aliases', () => {
  const { screens } = present();
  const survey = catalog.capabilities.find(capability => capability.id === 'survey').frontend.routes;
  assert.ok(survey.length > screens.survey, 'survey owns redirect aliases that are not screens');
  assert.equal(screens.survey, survey.filter(route => routeKinds.get(route) === 'page').length);
  assert.ok(survey.filter(route => routeKinds.get(route) !== 'page').every(route => /redirect/.test(routeKinds.get(route))));
  assert.equal(screens.dashboard, 0);
  const withoutRoute = new Map(routeKinds);
  withoutRoute.delete(survey[0]);
  assert.throws(() => present({ routeKinds: withoutRoute }), new RegExp(`route census lacks a capability route: survey ${survey[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  assert.throws(() => composerPresentation(catalog), /route kinds from the route census are required/);
});

test('a new capability without an area or summary, stale copy and developer text are refused', () => {
  const withAreas = areas => () => present({ areas });
  const first = COMPOSER_AREAS[0];
  const rest = COMPOSER_AREAS.slice(1);
  assert.throws(withAreas([{ ...first, domains: first.domains.slice(1) }, ...rest]), new RegExp(`capability has no area: ${first.domains[0]}`));
  assert.throws(withAreas([{ ...first, domains: [...first.domains, 'retired'] }, ...rest]), /area lists an unknown capability: .+\/retired/);
  assert.throws(withAreas([{ ...first, domains: [...first.domains, rest[0].domains[0]] }, ...rest]), /capability is in two areas/);
  assert.throws(withAreas([{ ...first, label: 'Communication' }, ...rest]), /area label contains Latin text/);
  assert.throws(withAreas([first, { ...rest[0], id: first.id }, ...rest.slice(1)]), /area is declared twice/);
  assert.throws(withAreas([first, { ...rest[0], label: first.label }, ...rest.slice(1)]), /area is declared twice/);
  assert.throws(withAreas([...COMPOSER_AREAS, { id: 'empty', label: '빈 영역', domains: [] }]), /area has no capability: empty/);
  const { mail, ...withoutMail } = CAPABILITY_SUMMARIES;
  assert.throws(() => present({ summaries: withoutMail }), /capability has no summary: mail/);
  assert.throws(() => present({ summaries: { ...CAPABILITY_SUMMARIES, stats: '업무 통계' } }), /summary has no capability: stats/);
  assert.throws(() => present({ summaries: { ...CAPABILITY_SUMMARIES, mail: 'MailService 발송' } }), /summary contains Latin text/);
  assert.throws(() => present({ summaries: { ...CAPABILITY_SUMMARIES, mail: '메'.repeat(31) } }), /summary is longer than 30 characters/);
  const { demo, ...withoutDemo } = PRESET_LABELS;
  assert.throws(() => present({ presetLabels: withoutDemo }), /preset has no label: demo/);
  assert.throws(() => present({ presetLabels: { ...PRESET_LABELS, archived: '보관' } }), /preset label has no preset: archived/);
});
