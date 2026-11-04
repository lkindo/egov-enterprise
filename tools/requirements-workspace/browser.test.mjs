import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { startRequirementsServer } from './server.mjs';
import { runBrowserChecks, runLifecycleChecks, seedLifecycleFixture } from './browser-check.mjs';

const context = { snapshotDigest: 'browser-synthetic-context-v1', commit: 'synthetic', modules: [{ id: 'core', label: '공통 기반', required: true }], capabilities: [], screens: [{ route: '/fixture-list', label: '검증 목록', status: 'partial' }], interfaces: [{ id: 'GET /api/fixture-list', status: 'partial', evidenceLevel: 'E1' }], tables: [], gates: [], presets: [] };
async function withWorkspace(run) {
  const directory = mkdtempSync(join(tmpdir(), 'requirements-browser-'));
  let app;
  try {
    app = await startRequirementsServer({ workspace: directory, port: 0, contextProvider: async () => context });
    return await run(app);
  } catch (error) {
    // Failed navigation diagnostics must not publish even a disposable launch secret.
    const redact = value => String(value ?? '').split(app?.launchSecret ?? '\0').join('[launch redacted]').replace(/#launch=[A-Za-z0-9_%.-]+/g, '#launch=[redacted]');
    const safe = new Error(redact(error.message)); safe.stack = redact(error.stack); throw safe;
  } finally {
    await app?.close();
    assert.equal(dirname(directory), resolve(tmpdir()));
    assert.ok(basename(directory).startsWith('requirements-browser-'));
    rmSync(directory, { recursive: true, force: true });
  }
}

test('real UI preserves drafts and persisted edits across reload, with responsive and accessible states', async () => {
  await withWorkspace(async app => {
    const result = await runBrowserChecks({ url: app.url, launch: app.launchSecret });
    assert.equal(result.interactionFlow, 'passed');
    assert.equal(result.accessibilityStates, 8);
    assert.ok((await app.engine.state()).backlog.businessRequirements.length > 0);
  });
});

test('real UI lifecycle downloads immutable baseline and task package, records evidence, and resumes', async () => {
  await withWorkspace(async app => {
    await seedLifecycleFixture(app.engine);
    const result = await runLifecycleChecks({ url: app.url, launch: app.launchSecret });
    assert.equal(result.actualBaseline, true);
    assert.equal(result.taskDownload, true);
    assert.equal(result.evidencedUat, 2);
    assert.equal(result.reload, true);
  });
});
