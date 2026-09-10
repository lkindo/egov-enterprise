import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const read = (file: string) => readFileSync(join(REPO_DIR, file), 'utf8');
const HTML = read('frontend/public/governance_harness_atlas.html');
const PANELS = ['start', 'map', 'domains', 'flows', 'rules', 'data', 'change', 'verification', 'operations', 'evidence'];
interface RecordData {
  id: string; source: string; title: string; summary: string; status: string;
  details?: Array<{ label: string; value: unknown }>;
  links?: Array<{ label: string; path: string }>;
}
interface CatalogData {
  schemaVersion: number; authority: string;
  facts: Record<string, string | number>;
  sources: Array<{ path: string; digest: string }>;
  catalogs: Record<string, RecordData[]>;
}
interface Browser {
  window: Window & typeof globalThis;
}
interface ConsoleCapture { on(event: string, listener: (...args: unknown[]) => void): void }
// jsdom is already a pinned frontend test dependency. A narrow adapter avoids an extra @types package.
const atlasRequire = createRequire(import.meta.url);
const { JSDOM, VirtualConsole } = atlasRequire('jsdom') as {
  JSDOM: new (html: string, options: Record<string, unknown>) => Browser;
  VirtualConsole: new () => ConsoleCapture;
};
const browsers: Browser[] = [];
let browser: Browser;
let current: CatalogData;
let document: Document;
let runtimeErrors: unknown[][];

function embedded(html: string): CatalogData {
  const json = /<script id="atlas-catalog-data" type="application\/json">([\s\S]*?)<\/script>/.exec(html)?.[1];
  if (!json) throw new Error('Generated Atlas catalog is missing');
  return JSON.parse(json) as CatalogData;
}
async function openAtlas(html: string) {
  const errors: unknown[][] = [];
  const console = new VirtualConsole();
  console.on('jsdomError', (...args) => errors.push(args));
  console.on('error', (...args) => errors.push(args));
  // Execute only the repository-generated document; external resource loading stays disabled.
  const dom = new JSDOM(html, {
    url: 'https://atlas.example.test/governance_harness_atlas.html',
    runScripts: 'dangerously', virtualConsole: console,
  });
  browsers.push(dom);
  if (dom.window.document.readyState === 'loading') {
    await new Promise<void>(resolve => dom.window.document.addEventListener('DOMContentLoaded', () => resolve(), { once: true }));
  }
  return { dom, errors };
}
function ids(records: RecordData[]) { return records.map(record => record.id).sort(); }
function cardId(kind: string, id: string) { return `atlas-${kind}-${encodeURIComponent(id)}`; }
function catalogFailures(doc: Document, expected: CatalogData): string[] {
  const failures: string[] = [];
  const actualKinds = [...doc.querySelectorAll<HTMLElement>('[data-catalog]')].map(slot => slot.dataset.catalog).sort();
  if (JSON.stringify(actualKinds) !== JSON.stringify(Object.keys(expected.catalogs).sort())) failures.push('catalog slots differ');
  for (const [kind, records] of Object.entries(expected.catalogs)) {
    const cards = [...doc.querySelectorAll<HTMLDetailsElement>(`.catalog-card[data-catalog-kind="${kind}"]`)];
    if (JSON.stringify(cards.map(card => card.dataset.recordId).sort()) !== JSON.stringify(ids(records))) failures.push(`${kind}: records differ`);
    for (const record of records) {
      const card = doc.getElementById(cardId(kind, record.id));
      if (!card || card.tagName !== 'DETAILS') { failures.push(`${kind}/${record.id}: missing card`); continue; }
      if (card.querySelector('summary strong')?.textContent !== (record.title || record.id)) failures.push(`${record.id}: title differs`);
      if (card.dataset.recordStatus !== record.status) failures.push(`${record.id}: status differs`);
      if (!card.querySelector('.catalog-detail')?.textContent?.includes(`상태 원문: ${record.status}`)) failures.push(`${record.id}: original status missing`);
      if (/^unverified$/i.test(record.status) && !/미확인|unverified/i.test(card.querySelector('summary .badge')?.textContent || '')) failures.push(`${record.id}: unverified label differs`);
      if (!card.textContent?.includes(record.source)) failures.push(`${record.id}: source missing`);
      const terms = [...card.querySelectorAll('dt')].map(node => node.textContent);
      const values = [...card.querySelectorAll('dd')].map(node => node.textContent);
      for (const [index, detail] of (record.details || []).entries()) {
        const expectedValue = typeof detail.value === 'object' ? JSON.stringify(detail.value, null, 2) : String(detail.value ?? '');
        if (terms[index] !== detail.label || values[index] !== expectedValue) failures.push(`${record.id}: detail differs: ${detail.label}`);
      }
    }
  }
  return failures;
}
function factFailures(doc: Document, facts: CatalogData['facts']): string[] {
  const nodes = [...doc.querySelectorAll<HTMLElement>('[data-fact]')];
  if (nodes.length === 0) return ['no rendered facts'];
  return nodes.flatMap(node => {
    const key = node.dataset.fact || '';
    return !Object.hasOwn(facts, key) || node.textContent?.trim() !== String(facts[key]) ? [`fact differs: ${key}`] : [];
  });
}
function navigate(panel: string, dom = browser) {
  dom.window.history.replaceState({}, '', `#${panel}`);
  dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'));
}
function textOf(id: string) {
  const section = document.getElementById(id)?.cloneNode(true) as HTMLElement | undefined;
  if (!section) throw new Error(`Missing narrative: ${id}`);
  section.querySelectorAll('[data-catalog],script,style').forEach(node => node.remove());
  return section.textContent?.replace(/\s+/g, ' ').trim() || '';
}
function filesUnder(directory: string, suffix: string): string[] {
  return readdirSync(join(REPO_DIR, directory), { withFileTypes: true }).flatMap(entry => {
    const file = `${directory}/${entry.name}`;
    return entry.isDirectory() ? filesUnder(file, suffix) : entry.name.endsWith(suffix) ? [file] : [];
  });
}

beforeAll(async () => {
  const { buildAtlasCatalog } = atlasRequire('../../../../scripts/atlas-catalog.mjs') as { buildAtlasCatalog(root: string): CatalogData };
  current = buildAtlasCatalog(REPO_DIR);
  const opened = await openAtlas(HTML);
  browser = opened.dom;
  document = browser.window.document;
  runtimeErrors = opened.errors;
}, 30000);
afterAll(() => browsers.forEach(dom => dom.window.close()));

describe('Governance Atlas rendered source and interaction contract', () => {
  it('executes the real renderer and represents every source record with its original status and details', () => {
    expect(runtimeErrors).toEqual([]);
    expect(document.body.dataset.atlasReady).toBe('true');
    expect(catalogFailures(document, current)).toEqual([]);
    expect(document.querySelectorAll('.catalog-card').length).toBe(Object.values(current.catalogs).reduce((sum, rows) => sum + rows.length, 0));
    expect([...document.querySelectorAll<HTMLDetailsElement>('.catalog-card')].every(card => !card.open)).toBe(true);
    const data = embedded(HTML);
    expect(data.catalogs).toEqual(current.catalogs);
    expect(data.sources).toEqual(current.sources);
    for (const source of data.sources) {
      const digest = createHash('sha256').update(read(source.path).replace(/\r\n/g, '\n')).digest('hex');
      expect(source.digest, source.path).toBe(digest);
    }
  });

  it('binds every fact occurrence and embedded fact to current source, including independent counts and versions', () => {
    const raw = new browser.window.DOMParser().parseFromString(HTML, 'text/html');
    expect(embedded(HTML).facts).toEqual(current.facts);
    expect(factFailures(raw, current.facts)).toEqual([]);
    expect(factFailures(document, current.facts)).toEqual([]);
    const registry = JSON.parse(read('config/governance/gates.json'));
    for (const [key, setId] of [['governanceCount', 'GATESET-GOVERNANCE-HARNESS'], ['architectureCount', 'GATESET-ARCHITECTURE'], ['schemaCount', 'GATESET-SCHEMA-VALIDATION']]) {
      expect(current.facts[key]).toBe(registry.gateSets.find((set: { id: string }) => set.id === setId).rules.length);
    }
    const javaTestSources = filesUnder('api-server/src/test/java', '.java').map(file => read(file));
    expect(current.facts.governanceCount).toBe(javaTestSources.filter(source => /@Tag\s*\(\s*"governance-harness"\s*\)/.test(source)).length);
    expect(current.facts.schemaCount).toBe(javaTestSources.filter(source => /@Tag\s*\(\s*"schema-validation"\s*\)/.test(source)).length);
    expect(current.facts.qualityPopulationCount).toBe(registry.qualityPopulations.length);
    expect(current.facts.qualityRatchetCount).toBe(registry.qualityRatchets.length);
    expect(current.facts.runnerCount).toBe(registry.gateSets.length - 3);
    expect(current.catalogs.executionProfiles).toHaveLength(registry.executionProfiles.length);
    const required = JSON.parse(read('.github/required-checks.json')).requiredChecks as Array<{ context: string }>;
    expect(ids(current.catalogs.requiredChecks)).toEqual(required.map(check => check.context).sort());
    expect(current.facts.requiredCount).toBe(required.length);
    const modules = [...read('settings.gradle').matchAll(/^include\s+['"]([^'"]+)['"]/gm)].map(match => match[1]);
    expect(ids(current.catalogs.modules)).toEqual([...modules, 'frontend'].sort());
    expect(current.facts.nodeVersion).toBe(read('.nvmrc').trim());
    const frontend = JSON.parse(read('frontend/package.json'));
    expect(current.facts.nextVersion).toBe(frontend.dependencies.next.replace(/^[~^]/, ''));
    expect(current.facts.nextVersionConstraint).toBe(frontend.dependencies.next);
    expect(current.facts.pnpmVersion).toBe(frontend.packageManager.replace(/^pnpm@/, ''));
    expect(read('build.gradle')).toContain(`version '${current.facts.bootVersion}'`);
    expect(read('gradle/wrapper/gradle-wrapper.properties')).toContain(`gradle-${current.facts.gradleVersion}-bin.zip`);
    const tests = filesUnder('migration-tool/src/test/java', '.java');
    const count = tests.reduce((total, file) => total + [...read(file).matchAll(/^\s*@(?:Test|ParameterizedTest|RepeatedTest|TestFactory|TestTemplate)\b/gm)].length, 0);
    expect(current.facts.migrationTestCount).toBe(count);
    expect(current.facts.migrationTestFileCount).toBe(tests.filter(file => file.endsWith('Test.java')).length);
    const sharedPostgres = filesUnder('api-server/src/test/java/nuri/api/schema', '.java')
      .filter(file => /class\s+\w+\s+extends\s+SharedPostgresMigrationTestSupport\b/.test(read(file)));
    expect(sharedPostgres.length).toBeGreaterThan(0);
    expect(current.facts.sharedPostgresClassCount).toBe(sharedPostgres.length);
    const migrations = filesUnder('api-server/src/main/resources/db/migration', '.sql');
    const markers = migrations.map(file => (read(file).match(/linter:ignore/g) || []).length);
    expect(current.facts.waiverCount).toBe(markers.reduce((sum, count) => sum + count, 0));
    expect(current.facts.waiverFileCount).toBe(markers.filter(Boolean).length);
  });

  it('keeps exactly ten navigable topics and preserves all thirteen old panel URLs', () => {
    expect([...document.querySelectorAll('section.atlas-panel')].map(panel => panel.id)).toEqual(PANELS.map(id => `content-${id}`));
    expect([...document.querySelectorAll<HTMLElement>('nav a[data-panel]')].map(link => link.dataset.panel)).toEqual(PANELS);
    const aliases: Record<string, string> = { welcome: 'start', onboarding: 'start', constitution: 'rules', rules: 'rules', skills: 'rules', sop: 'verification', harnesses: 'verification', workflow: 'change', simulator: 'change', ralph: 'change', db: 'data', migration: 'data', gaps: 'evidence' };
    for (const [alias, panel] of Object.entries(aliases)) {
      for (const prefix of ['', 'tab-', 'content-']) {
        navigate(prefix + alias);
        expect(document.body.dataset.activePanel, prefix + alias).toBe(panel);
        expect([...document.querySelectorAll<HTMLElement>('.atlas-panel')].filter(node => !node.hidden).map(node => node.id)).toEqual([`content-${panel}`]);
      }
    }
    navigate('not-a-panel');
    expect(document.body.dataset.activePanel).toBe('start');
  });

  it('resolves direct diagram links to their containing topic and keeps the skip link on the current topic', () => {
    for (const [anchor, panel] of Object.entries({ 'migration-flow': 'data', 'identity-axes': 'flows', 'field-change-flow': 'data', 'backup-flow': 'operations' })) {
      navigate(anchor);
      expect(document.body.dataset.activePanel, anchor).toBe(panel);
      expect((document.getElementById(`content-${panel}`) as HTMLElement).hidden).toBe(false);
    }
    navigate('verification');
    navigate('main-content');
    expect(document.body.dataset.activePanel).toBe('verification');
    for (const [kind, records] of Object.entries(current.catalogs)) {
      const card = document.getElementById(cardId(kind, records[0].id)) as HTMLDetailsElement;
      const panel = card.closest('.atlas-panel')!.id.replace(/^content-/, '');
      navigate(card.id);
      expect(document.body.dataset.activePanel, kind).toBe(panel);
      expect(card.open, kind).toBe(true);
      card.open = false;
    }
  });

  it('finds a source record, opens its exact card and clears a hiding catalog filter', () => {
    const record = current.catalogs.gates[0];
    const slot = document.querySelector<HTMLElement>('[data-catalog="gates"]')!;
    const filter = slot.querySelector<HTMLInputElement>('input[type="search"]')!;
    filter.value = 'a-query-that-matches-no-gate';
    filter.dispatchEvent(new browser.window.Event('input'));
    const card = document.getElementById(cardId('gates', record.id)) as HTMLDetailsElement;
    expect(card.hidden).toBe(true);
    const search = document.getElementById('atlas-search') as HTMLInputElement;
    search.value = record.id;
    search.dispatchEvent(new browser.window.Event('input'));
    const result = [...document.querySelectorAll<HTMLAnchorElement>('#search-results a')].find(link => link.hash.includes(card.id));
    expect(result).toBeDefined();
    navigate(result!.hash.slice(1));
    expect(document.body.dataset.activePanel).toBe('verification');
    expect(card.open).toBe(true);
    expect(card.hidden).toBe(false);
    expect(filter.value).toBe('');
    search.dispatchEvent(new browser.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(search.value).toBe('');
    expect(document.querySelectorAll('#search-results li')).toHaveLength(0);
    card.open = false;
    const workflow = current.catalogs.workflows[0];
    search.value = workflow.id;
    search.dispatchEvent(new browser.window.Event('input'));
    const workflowCard = document.getElementById(cardId('workflows', workflow.id)) as HTMLDetailsElement;
    const workflowResult = [...document.querySelectorAll<HTMLAnchorElement>('#search-results a')].find(link => link.hash.includes(workflowCard.id));
    expect(workflowResult).toBeDefined();
    navigate(workflowResult!.hash.slice(1));
    expect(document.body.dataset.activePanel).toBe(workflowCard.closest('.atlas-panel')!.id.replace(/^content-/, ''));
    expect(workflowCard.open).toBe(true);
    workflowCard.open = false;
    search.dispatchEvent(new browser.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  });

  it('supports navigation keys and persistent accessible theme controls', () => {
    const links = [...document.querySelectorAll<HTMLAnchorElement>('nav a[data-panel]')];
    links[0].focus();
    links[0].dispatchEvent(new browser.window.KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(document.activeElement).toBe(links.at(-1));
    links.at(-1)!.dispatchEvent(new browser.window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(links[0]);
    const button = document.getElementById('theme-toggle') as HTMLButtonElement;
    expect(button.getAttribute('aria-pressed')).toBe('false');
    button.click();
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(browser.window.localStorage.getItem('egov-atlas-theme')).toBe('dark');
    button.click();
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(HTML).toMatch(/prefers-reduced-motion:[\s\S]*animation-duration:\s*0ms\s*!important/);
  });

  it('opens print content for all/current scope and restores original collapsed and hidden states', () => {
    navigate('verification');
    const cards = [...document.querySelectorAll<HTMLDetailsElement>('.catalog-card')];
    cards[0].hidden = true;
    cards[1].open = true;
    const initial = cards.map(card => ({ open: card.open, hidden: card.hidden }));
    const scope = document.getElementById('print-scope') as HTMLSelectElement;
    for (const value of ['all', 'current']) {
      scope.value = value;
      scope.dispatchEvent(new browser.window.Event('change'));
      browser.window.dispatchEvent(new browser.window.Event('beforeprint'));
      browser.window.dispatchEvent(new browser.window.Event('beforeprint'));
      expect(document.body.dataset.printScope).toBe(value);
      for (const [index, card] of cards.entries()) {
        const shouldOpen = value === 'all' || !!card.closest('#content-verification');
        expect(card.open).toBe(shouldOpen || initial[index].open);
        expect(card.hidden).toBe(shouldOpen ? false : initial[index].hidden);
      }
      browser.window.dispatchEvent(new browser.window.Event('afterprint'));
      expect(cards.map(card => ({ open: card.open, hidden: card.hidden }))).toEqual(initial);
    }
    cards[0].hidden = false; cards[1].open = false;
    expect(HTML).toMatch(/data-print-scope="all"[\s\S]*\.atlas-panel\[hidden\]/);
  });

  it('offers five bounded verification choices without manufacturing approval or test success', () => {
    const select = document.getElementById('change-kind') as HTMLSelectElement;
    expect([...select.options].map(option => option.value).sort()).toEqual(['api', 'db', 'docs', 'gate', 'ui']);
    const commands: Record<string, string[]> = { docs: ['atlas:check', 'verify:docs'], api: ['verify:be', 'verify:fe'], ui: ['verify:fe', 'verify:e2e'], db: ['verify:full', 'verify:e2e'], gate: ['verify:docs', 'verify:full'] };
    for (const [kind, expected] of Object.entries(commands)) {
      select.value = kind;
      select.dispatchEvent(new browser.window.Event('change'));
      const advice = document.getElementById('verification-advice')!;
      expect([...advice.querySelectorAll('pre')].map(node => node.textContent)).toEqual(expected.map(command => `npm run ${command}`));
      expect(advice.textContent).toMatch(/교육용[\s\S]*실제 검증[\s\S]*않습니다/);
    }
  });

  it('branches failure practice from bounded retries to stop, unverified evidence and explicit approval', () => {
    const scenario = document.getElementById('failure-case') as HTMLSelectElement;
    const attempts = document.getElementById('failure-count') as HTMLSelectElement;
    const result = document.getElementById('failure-advice')!;
    expect([...scenario.options].map(option => option.value)).toEqual(['ready', 'red', 'unknown', 'approval']);
    expect([...attempts.options].map(option => option.value)).toEqual(['1', '2', '3']);
    expect(document.querySelector('label[for="failure-case"]')).not.toBeNull();
    expect(document.querySelector('label[for="failure-count"]')).not.toBeNull();
    expect(result.getAttribute('aria-live')).toBe('polite');
    expect(attempts.disabled).toBe(true);
    expect(result.dataset.branch).toBe('ready');
    scenario.value = 'red';
    scenario.dispatchEvent(new browser.window.Event('change'));
    expect(attempts.disabled).toBe(false);
    expect(result.dataset.branch).toBe('red');
    expect(result.textContent).toMatch(/원인[\s\S]*최소 수정[\s\S]*테스트를 약화[\s\S]*않습니다/);
    attempts.value = '3';
    attempts.dispatchEvent(new browser.window.Event('change'));
    expect(result.dataset.branch).toBe('stop');
    expect(result.textContent).toMatch(/재시도 종료[\s\S]*3회[\s\S]*멈추고[\s\S]*보고/);
    scenario.value = 'unknown';
    scenario.dispatchEvent(new browser.window.Event('change'));
    expect(result.dataset.branch).toBe('unknown');
    expect(result.textContent).toMatch(/미확인 유지[\s\S]*운영 성공을 판정하지 않습니다/);
    scenario.value = 'approval';
    scenario.dispatchEvent(new browser.window.Event('change'));
    expect(result.dataset.branch).toBe('approval');
    expect(result.textContent).toMatch(/승인 경계에서 대기[\s\S]*명시 승인 전[\s\S]*실행하지 않습니다/);
    scenario.value = 'ready';
    scenario.dispatchEvent(new browser.window.Event('change'));
    expect(attempts.disabled).toBe(true);
    expect(result.dataset.branch).toBe('ready');
    expect(result.querySelectorAll('ol > li')).toHaveLength(3);
  });

  it('retains source-safe new-window links and renders catalog content without executable HTML', () => {
    for (const node of document.querySelectorAll('*')) {
      expect([...node.attributes].filter(attribute => /^on/i.test(attribute.name)), node.tagName).toEqual([]);
    }
    const links = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')];
    expect(links.length).toBeGreaterThan(Object.keys(current.catalogs).length);
    for (const link of links) {
      expect(link.getAttribute('href')).not.toMatch(/^(?:javascript:|data:|file:)/i);
      if (!link.href.startsWith('https://github.com/')) continue;
      expect(link.target).toBe('_blank');
      expect(link.rel.split(/\s+/)).toEqual(expect.arrayContaining(['noopener', 'noreferrer']));
      const relative = new URL(link.href).pathname.match(/^\/lkindo\/egov-enterprise\/(?:blob|tree)\/main\/(.+)$/)?.[1];
      if (relative) expect(existsSync(join(REPO_DIR, decodeURIComponent(relative))), link.href).toBe(true);
    }
    expect(document.querySelectorAll('script[src],link[rel="stylesheet"][href^="http"]')).toHaveLength(0);
  });

  it('keeps governance authority, native loading, identity and read-only data boundaries explicit', () => {
    const rules = textOf('content-rules');
    for (const term of ['AGENTS.md', 'H1', 'H2', 'H3', 'H4', 'H5',
      'project-context.md', 'decisions.md', 'known-gaps.md',
      '~/.gemini/GEMINI.md', '~/.claude/CLAUDE.md', '~/.codex/AGENTS.md']) {
      expect(rules, term).toContain(term);
    }
    expect(rules).toMatch(/비규범|파생 인덱스/);
    expect(rules).toMatch(/자동 상속|독립.*로드|자동.*전파/);
    expect(read('AGENTS.md')).toContain('vendor-neutral 프로젝트 규칙 SSOT');
    expect(read('GEMINI.md')).toContain('@./AGENTS.md');
    expect(read('CLAUDE.md')).toContain('@AGENTS.md');
    const data = textOf('content-data');
    expect(data).toMatch(/db[- ]bridge/i);
    expect(data).toMatch(/읽기 전용|read-only/);
    const flows = textOf('content-flows');
    expect(flows).toContain('esntlId');
    expect(flows).toContain('loginId');
    expect(textOf('content-change')).toMatch(/3회|세 번/);
    const narrative = PANELS.map(panel => textOf(`content-${panel}`)).join('\n');
    for (const stale of ['STRICT_MUTATION=false', 'Node.js 20+', 'frontend/src/middleware.ts',
      'DashboardResponseDto.java', 'api-contract-guardian 자동 가동', 'GStack Review',
      'docs-only는 두 경량 계약', '5 STABLE', 'TanStack Query/dehydrate 표준 패턴과 충돌']) {
      expect(narrative, stale).not.toContain(stale);
    }
    expect(narrative).not.toMatch(/webmaster.{0,40}(?:PW|password|비밀번호).{0,10}\b1\b/is);
  });

  it('preserves dependency trust, selective enforcement and local versus CI evidence boundaries', () => {
    const verification = textOf('content-verification');
    const dependency = textOf('content-operations');
    for (const term of ['workflow_run', String(current.facts.snapshotWaitSeconds), 'Critical', 'High']) {
      expect(dependency, term).toContain(term);
    }
    expect(verification).toContain('K6_SCENARIO');
    expect(dependency).toMatch(/read-only|읽기 전용/);
    expect(dependency).toMatch(/fail-closed/);
    expect(dependency).toMatch(/운영.*High/);
    expect(dependency).toMatch(/개발.*High.*warning|개발.*High.*경고/);
    expect(verification).toMatch(/full[\s\S]*E2E[\s\S]*(?:별도|포함하지|밖)/);
    expect(verification).toMatch(/pre-push[\s\S]*우회/);
    expect(read('.github/workflows/dependency-submission.yml')).toContain('dependency-graph: generate-and-upload');
    expect(read('.github/workflows/dependency-submission-publish.yml')).toContain('workflow_run:');
    expect(read('.github/workflows/ci.yml')).toContain(`SNAPSHOT_WAIT_SECONDS: "${current.facts.snapshotWaitSeconds}"`);
    expect(read('scripts/frontend-audit-policy.mjs')).toContain('pnpm audit --json --audit-level low');
    expect(read('scripts/run-load-test.ps1')).toContain('-e "K6_SCENARIO=$scenario"');
    const controller = read('api-server/src/main/java/nuri/api/controller/business/main/DashboardApiController.java');
    expect(controller).toContain('ApiResponse<DashboardResponse>');
    expect(read('frontend/src/app/dashboard-data.ts')).toContain('executeGeneratedOperation(getDashboardDataOperation');
    expect(textOf('content-flows')).toContain('DashboardResponse');
  });

  it('keeps migration phases and partial commit/recovery limits distinct from production proof', () => {
    const migration = textOf('migration-flow');
    for (const term of ['discover', 'plan', 'validate', 'load', 'dry-run', 'commit', 'STARTED', 'PASS', 'WARN', 'FAIL']) {
      expect(migration.toLowerCase(), term).toContain(term.toLowerCase());
    }
    expect(migration).toMatch(/non-zero|0이 아닌|비영/);
    expect(migration).toMatch(/read-only|읽기 전용/);
    expect(migration).toMatch(/checkpoint|체크포인트/);
    expect(migration).toMatch(/미확정/);
    expect(migration).toMatch(/부분.*커밋|커밋.*부분/);
    expect(migration).toMatch(/PostgreSQL/);
    expect(migration).toMatch(/운영[\s\S]*(?:별도|미검증|미확인)/);
    const operations = textOf('content-operations');
    for (const term of ['digest', 'revision', 'deploy.sh', 'RTO', 'RPO']) expect(operations, term).toContain(term);
    expect(operations).toMatch(/발행[\s\S]*배포[\s\S]*(?:별도|분리|아닙니다)/);
    expect(operations).toMatch(/DB[\s\S]*첨부[\s\S]*키/);
  });

  it('explains all six representative flows with ordered steps, boundaries and source evidence', () => {
    const flows = ['dashboard-flow', 'auth-flow', 'write-flow', 'sanction-flow', 'attachment-flow', 'migration-flow'];
    for (const id of flows) {
      const flow = document.getElementById(id)!;
      expect(flow, id).not.toBeNull();
      expect(flow.querySelector('figure.diagram figcaption')?.textContent?.trim(), id).toBeTruthy();
      const steps = [...flow.querySelectorAll('ol.flow > li')];
      expect(steps.length, id).toBeGreaterThanOrEqual(4);
      for (const step of steps) {
        expect(step.querySelector('strong')?.textContent?.trim(), id).toBeTruthy();
        expect(step.querySelector('p')?.textContent?.trim(), id).toBeTruthy();
      }
      expect(flow.querySelectorAll('.source-links a[href^="https://github.com/lkindo/egov-enterprise/"]').length, id).toBeGreaterThanOrEqual(2);
    }
    const migrationSteps = [...document.querySelectorAll('#migration-flow .flow-vertical > li > strong')].map(node => node.textContent);
    expect(migrationSteps).toHaveLength(5);
    for (const [index, phase] of ['Discover', 'Plan', 'Validate', 'Load', 'Run-scoped verification'].entries()) {
      expect(migrationSteps[index]).toContain(phase);
    }
    expect(textOf('auth-flow')).toMatch(/401[\s\S]*403[\s\S]*503[\s\S]*Retry-After/);
    expect(textOf('sanction-flow')).toMatch(/커밋[\s\S]*실패[\s\S]*자동 롤백하지/);
    expect(textOf('attachment-flow')).toMatch(/읽기 전용[\s\S]*자동 삭제/);
  });

  it('connects five trace examples to existing records and focuses evidence found through linked filenames', async () => {
    const traces = [...document.querySelectorAll<HTMLElement>('[data-trace-case]')];
    expect(traces.map(trace => trace.dataset.traceCase)).toEqual(['authorization', 'field-contract', 'response-dto', 'url-policy', 'form-recovery']);
    for (const trace of traces) {
      expect(trace.querySelectorAll('ol.flow > li')).toHaveLength(5);
      expect(trace.querySelectorAll('[data-trace-rule]').length).toBeGreaterThan(0);
      expect(trace.querySelectorAll('[data-trace-gate],[data-trace-runner]').length).toBeGreaterThan(0);
      for (const [attribute, kind] of [['data-trace-rule', 'constitutions'], ['data-trace-gate', 'gates'], ['data-trace-runner', 'runners']]) {
        for (const link of trace.querySelectorAll<HTMLAnchorElement>(`[${attribute}]`)) {
          const id = link.getAttribute(attribute)!;
          expect(ids(current.catalogs[kind]), `${trace.id}/${id}`).toContain(id);
          expect(link.hash).toContain(cardId(kind, id));
          expect(document.getElementById(cardId(kind, id))).not.toBeNull();
        }
      }
    }
    const candidate = Object.entries(current.catalogs).flatMap(([kind, records]) => records.flatMap(record =>
      (record.links || []).map(link => ({ kind, record, filename: link.path.split('/').at(-1)! })),
    )).find(({ record, filename }) => filename.length > 12
      && !JSON.stringify([record.id, record.title, record.summary, record.source, record.details]).toLowerCase().includes(filename.toLowerCase()));
    expect(candidate).toBeDefined();
    const search = document.getElementById('atlas-search') as HTMLInputElement;
    search.value = candidate!.filename;
    search.dispatchEvent(new browser.window.Event('input'));
    const target = document.getElementById(cardId(candidate!.kind, candidate!.record.id)) as HTMLDetailsElement;
    const result = [...document.querySelectorAll<HTMLAnchorElement>('#search-results a')].find(link => link.hash.includes(target.id));
    expect(result, candidate!.filename).toBeDefined();
    result!.click();
    await expect.poll(() => document.activeElement).toBe(target.querySelector('summary'));
    expect(document.body.dataset.activePanel).toBe(target.closest('.atlas-panel')!.id.replace(/^content-/, ''));
    expect(target.open).toBe(true);
    target.open = false;
    search.dispatchEvent(new browser.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  });

  it('exposes removed renderers, missing slots and deleted or falsely upgraded records as red', async () => {
    const removed = HTML.replace(/<script id="atlas-runtime">[\s\S]*?<\/script>/, '');
    expect(removed).not.toBe(HTML);
    const blank = await openAtlas(removed);
    expect(blank.errors).toEqual([]);
    expect(catalogFailures(blank.dom.window.document, current)).not.toEqual([]);
    const damaged = document.cloneNode(true) as Document;
    const slot = damaged.querySelector('[data-catalog="gates"]')!;
    const slotParent = slot.parentNode!;
    const slotNext = slot.nextSibling;
    slot.remove();
    expect(catalogFailures(damaged, current)).toContain('catalog slots differ');
    slotParent.insertBefore(slot, slotNext);
    const deletedCard = damaged.querySelector('.catalog-card')!;
    const cardParent = deletedCard.parentNode!;
    const cardNext = deletedCard.nextSibling;
    deletedCard.remove();
    expect(catalogFailures(damaged, current)).not.toEqual([]);
    cardParent.insertBefore(deletedCard, cardNext);
    const route = current.catalogs.routes.find(record => /unverified/i.test(record.status));
    expect(route).toBeDefined();
    damaged.getElementById(cardId('routes', route!.id))!.dataset.recordStatus = 'VERIFIED';
    expect(catalogFailures(damaged, current)).toContain(`${route!.id}: status differs`);
    damaged.getElementById(cardId('routes', route!.id))!.dataset.recordStatus = route!.status;
    damaged.getElementById(cardId('routes', route!.id))!.querySelector('.badge')!.textContent = 'VERIFIED';
    expect(catalogFailures(damaged, current)).toContain(`${route!.id}: unverified label differs`);
  });

  it('rejects an altered duplicate fact even while another correct occurrence remains', () => {
    const copy = new browser.window.DOMParser().parseFromString(HTML, 'text/html');
    const original = copy.querySelector<HTMLElement>('[data-fact]')!;
    const repeated = original.cloneNode(true) as HTMLElement;
    original.after(repeated);
    expect(factFailures(copy, current.facts)).toEqual([]);
    repeated.textContent = '999';
    expect(original.textContent).toBe(String(current.facts[original.dataset.fact!]));
    expect(factFailures(copy, current.facts)).toContain(`fact differs: ${repeated.dataset.fact}`);
  });
});
