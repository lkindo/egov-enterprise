import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  buildBoundaryCensus,
  compareBoundaryCensus,
  evaluateBoundaryCompletion,
  validateBoundaryCensus,
} from './generated-boundary-census.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(repoRoot, 'config', 'governance', 'generated-api-boundaries.json');

const widgetGeneratedOperations = `
  const defineGeneratedOperation = (descriptor: unknown) => descriptor;
  export const createWidgetOperation = defineGeneratedOperation({
    id: "createWidget",
    method: "post",
    path: "/api/v1/widgets",
    requestKind: "json",
    responseKind: "json",
  });
`;

function writeFixture(files, paths = {}) {
  const root = mkdtempSync(join(tmpdir(), 'generated-boundary-census-'));
  const apiDocs = {
    openapi: '3.0.1',
    paths: {
      '/api/v1/widgets': {
        get: { operationId: 'getWidgets', responses: { 200: { description: 'ok' } } },
        post: { operationId: 'createWidget', responses: { 200: { description: 'ok' } } },
      },
      '/api/v1/widgets/{widgetId}': {
        get: { operationId: 'getWidget', responses: { 200: { description: 'ok' } } },
      },
      '/api/v1/healthz': {
        get: { operationId: 'healthz', responses: { 200: { description: 'ok' } } },
      },
      '/api/v1/users/{userId}': {
        get: { operationId: 'getUser', responses: { 200: { description: 'ok' } } },
      },
      ...paths,
    },
  };
  writeFileSync(join(root, 'api-docs.json'), `${JSON.stringify(apiDocs, null, 2)}\n`);
  for (const [relativePath, source] of Object.entries(files)) {
    const absolutePath = join(root, relativePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, source);
  }
  return root;
}

function withFixture(files, callback, paths) {
  const root = writeFixture(files, paths);
  try {
    return callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('inventories every production HTTP boundary at call level with honest classifications', () => {
  withFixture({
    'frontend/src/types/generated-operations.ts': widgetGeneratedOperations,
    'frontend/src/services/WidgetService.ts': `
      import { ApiService } from '@/services/core/ApiService';
      import { createWidgetOperation } from '@/types/generated-operations';
      class WidgetService extends ApiService {
        constructor() { super('/widgets'); }
        list() { return this.get(''); }
        one(widgetId: number) { return this.get(\`/\${widgetId}\`); }
        create(body: unknown) { return this.executeGenerated(createWidgetOperation, { body }); }
      }
    `,
    'frontend/src/lib/direct-widget.ts': `
      import api from '@/lib/api/client';
      export const load = () => api.get('/widgets');
    `,
    'frontend/src/services/UnknownService.ts': `
      import { ApiService } from '@/services/core/ApiService';
      class UnknownService extends ApiService {
        constructor() { super('/rough-maps'); }
        list() { return this.get(''); }
      }
    `,
    'frontend/src/services/BinaryService.ts': `
      import { ApiService } from '@/services/core/ApiService';
      class BinaryService extends ApiService {
        constructor() { super('/files'); }
        download(fileId: number) {
          return this.get(\`/\${fileId}\`, { responseType: 'blob' });
        }
      }
    `,
    'frontend/src/app/api/auth/login/route.ts': `
      import axios from 'axios';
      export const POST = (body: unknown) => axios.post('http://backend/api/v1/auth/login', body);
    `,
    'frontend/src/services/AuthRouteService.ts': `
      import api from '@/lib/api/client';
      export const login = (body: unknown) => api.post('/api/auth/login', body, { baseURL: '' });
    `,
    'frontend/src/services/MonitoringAdminService.ts': `
      import axios from 'axios';
      const actuatorInstance = axios.create({ baseURL: '/actuator/' });
      export const health = () => actuatorInstance.get('health');
    `,
    'frontend/src/services/MultipartService.ts': `
      import { ApiService } from '@/services/core/ApiService';
      class MultipartService extends ApiService {
        constructor() { super('/files'); }
        upload() {
          const body = new FormData();
          return this.post('', body, { headers: { 'Content-Type': 'multipart/form-data' } });
        }
      }
    `,
  }, (root) => {
    const census = buildBoundaryCensus({ repoRoot: root });

    assert.deepEqual(validateBoundaryCensus(census), []);
    assert.deepEqual(census.summary.byClassification, {
      generated: 1,
      legacy: 2,
      direct: 1,
      unmapped: 1,
      special: 5,
    });
    assert.equal(census.summary.total, 10);
    assert.equal(census.summary.eligible, 5);
    assert.equal(census.summary.adoptionPercent, 20);
    assert.deepEqual(
      census.records.filter(({ classification }) => classification === 'special').map(({ specialCase }) => specialCase),
      ['auth-bff', 'auth-route-client', 'binary', 'actuator', 'multipart'],
    );
    assert.ok(census.records.some(({ operationId }) => operationId === 'getWidget'));
    assert.ok(census.records.some(({ operationId }) => operationId === 'createWidget'));
    assert.ok(census.records.some(({ target }) => target === '/api/v1/rough-maps'));
  });
});

test('ignores general transport infrastructure but inventories its explicit auth reissue boundary', () => {
  withFixture({
    'frontend/src/services/NoCalls.ts': `
      const text = "client.get('/ghost')";
      // fetch('/comment');
      /* this.post('/also-commented'); */
      export { text };
    `,
    'frontend/src/services/__tests__/NoCalls.test.ts': `fetch('/test-only');`,
    'frontend/src/lib/api/client.ts': `
      import axios from 'axios';
      const transport = axios.create({ baseURL: '/api/v1' });
      export const client = { get: (url: string) => transport.get(url) };
      export const reissue = () => transport.post('/api/auth/reissue', {}, { baseURL: '' });
    `,
    'frontend/src/services/core/ApiService.ts': `
      import client from '@/lib/api/client';
      export class ApiService { get(path: string) { return client.get(path); } }
    `,
    'frontend/src/types/fake.d.ts': `declare function fetch(path: string): void;`,
  }, (root) => {
    const census = buildBoundaryCensus({ repoRoot: root });
    assert.equal(census.records.length, 1);
    assert.deepEqual(census.records[0], {
      ...census.records[0],
      file: 'frontend/src/lib/api/client.ts',
      classification: 'special',
      method: 'post',
      target: '/api/auth/reissue',
      mappingStatus: 'explicit-special-case',
      specialCase: 'auth-route-client',
    });
    assert.equal(census.summary.byClassification.special, 1);
    assert.equal(census.summary.bySpecialCase['auth-route-client'], 1);
  });
});

test('does not misclassify a static segment as an OpenAPI path parameter', () => {
  withFixture({
    'frontend/src/services/UserService.ts': `
      import { ApiService } from '@/services/core/ApiService';
      class UserService extends ApiService {
        constructor() { super('/users'); }
        checkId() { return this.get('/check-id'); }
      }
    `,
  }, (root) => {
    const [record] = buildBoundaryCensus({ repoRoot: root }).records;
    assert.equal(record.target, '/api/v1/users/check-id');
    assert.equal(record.classification, 'unmapped');
    assert.equal(record.mappingStatus, 'no-exact-openapi-route');
  });
});

test('a newly introduced legacy or raw boundary makes the ratchet red', () => {
  withFixture({
    'frontend/src/types/generated-operations.ts': widgetGeneratedOperations,
    'frontend/src/services/GeneratedOnly.ts': `
      import { executeGeneratedOperation } from '@/lib/api/generated-api-client';
      import { createWidgetOperation } from '@/types/generated-operations';
      export const create = (body: unknown) =>
        executeGeneratedOperation(createWidgetOperation, { body });
    `,
  }, (root) => {
    const baseline = buildBoundaryCensus({ repoRoot: root });
    assert.deepEqual(compareBoundaryCensus(baseline, baseline), []);

    const legacyPath = join(root, 'frontend/src/services/LegacyWidgetService.ts');
    writeFileSync(legacyPath, `
      import { ApiService } from '@/services/core/ApiService';
      class LegacyWidgetService extends ApiService {
        constructor() { super('/widgets'); }
        list() { return this.get(''); }
      }
    `);
    const withLegacy = buildBoundaryCensus({ repoRoot: root });
    assert.match(compareBoundaryCensus(baseline, withLegacy).join('\n'), /new legacy boundary/i);

    rmSync(legacyPath);
    const rawPath = join(root, 'frontend/src/raw-health.ts');
    writeFileSync(rawPath, `export const raw = () => fetch('/api/v1/healthz');\n`);
    const withRaw = buildBoundaryCensus({ repoRoot: root });
    assert.match(compareBoundaryCensus(baseline, withRaw).join('\n'), /new direct boundary/i);
  });
});

test('generated transport infrastructure is excluded and multipart executors are generated boundaries', () => {
  withFixture({
    'frontend/src/types/generated-operations.ts': widgetGeneratedOperations,
    'frontend/src/lib/api/generated-api-client.ts': `
      import client from './client';
      export const executeGeneratedOperation = (operation: unknown) => client.requestRaw({ operation });
      export const executeGeneratedMultipartOperation = (operation: unknown) => client.requestRaw({ operation });
    `,
    'frontend/src/generated-multipart.ts': `
      import { createWidgetOperation } from './types/generated-operations';
      import { executeGeneratedMultipartOperation } from './lib/api/generated-api-client';
      export const create = (formData: FormData) =>
        executeGeneratedMultipartOperation(createWidgetOperation, { formData });
    `,
  }, (root) => {
    const census = buildBoundaryCensus({ repoRoot: root });
    const multipart = census.records.find(({ file }) => file.endsWith('generated-multipart.ts'));
    assert.equal(multipart?.classification, 'generated');
    assert.equal(multipart?.operationId, 'createWidget');
    assert.equal(census.records.some(({ file }) => file.endsWith('generated-api-client.ts')), false);
  });
});

test('binds aliased generated executors, descriptors, and service bases to their exact imports', () => {
  withFixture({
    'frontend/src/types/generated-operations.ts': widgetGeneratedOperations,
    'frontend/src/direct-generated.ts': `
      import { executeGeneratedOperation as runGenerated } from '@/lib/api/generated-api-client';
      import { createWidgetOperation as createWidget } from '@/types/generated-operations';
      export const create = (body: unknown) => runGenerated(createWidget, { body });
    `,
    'frontend/src/services/AliasedWidgetService.ts': `
      import { ApiService as BoundApiService } from '@/services/core/ApiService';
      import { createWidgetOperation as createWidget } from '@/types/generated-operations';
      class AliasedWidgetService extends BoundApiService {
        constructor() { super('/widgets'); }
        create(body: unknown) { return this.executeGenerated(createWidget, { body }); }
      }
    `,
  }, (root) => {
    const census = buildBoundaryCensus({ repoRoot: root });

    assert.equal(census.records.length, 2);
    assert.deepEqual(census.records.map(({ classification }) => classification), [
      'generated',
      'generated',
    ]);
    assert.deepEqual(census.records.map(({ descriptorName }) => descriptorName), [
      'createWidgetOperation',
      'createWidgetOperation',
    ]);
    assert.ok(census.records.every(({ mappingStatus }) => mappingStatus === 'generated-operation'));
  });
});

test('fails closed for local and wrong-source generated executor or descriptor lookalikes', () => {
  withFixture({
    'frontend/src/types/generated-operations.ts': widgetGeneratedOperations,
    'frontend/src/local-fake-generated.ts': `
      const createWidgetOperation = { id: 'createWidget' };
      function executeGeneratedOperation(operation: unknown, args: unknown) {
        return fetch('/api/v1/widgets', { method: 'POST', body: JSON.stringify({ operation, args }) });
      }
      export const create = (body: unknown) =>
        executeGeneratedOperation(createWidgetOperation, { body });
    `,
    'frontend/src/wrong-source-generated.ts': `
      import { executeGeneratedOperation as runGenerated } from '@/test-doubles/generated-api-client';
      import { createWidgetOperation } from '@/types/generated-operations';
      export const create = (body: unknown) => runGenerated(createWidgetOperation, { body });
    `,
    'frontend/src/local-fake-descriptor.ts': `
      import { executeGeneratedOperation } from '@/lib/api/generated-api-client';
      const createWidgetOperation = { id: 'createWidget' };
      export const create = (body: unknown) =>
        executeGeneratedOperation(createWidgetOperation, { body });
    `,
    'frontend/src/services/FakeWidgetService.ts': `
      class ApiService {
        executeGenerated(operation: unknown, args: unknown) { return { operation, args }; }
      }
      const createWidgetOperation = { id: 'createWidget' };
      class FakeWidgetService extends ApiService {
        create(body: unknown) { return this.executeGenerated(createWidgetOperation, { body }); }
      }
    `,
  }, (root) => {
    const census = buildBoundaryCensus({ repoRoot: root });
    const generatedLookalikes = census.records.filter(({ callee }) => (
      ['executeGeneratedOperation', 'runGenerated', 'this.executeGenerated'].includes(callee)
    ));

    assert.equal(generatedLookalikes.length, 4);
    assert.deepEqual(generatedLookalikes.map(({ classification }) => classification), [
      'unmapped',
      'unmapped',
      'unmapped',
      'unmapped',
    ]);
    assert.deepEqual(generatedLookalikes.map(({ mappingStatus }) => mappingStatus), [
      'unbound-generated-descriptor',
      'unbound-generated-executor',
      'unbound-generated-executor',
      'unbound-generated-executor',
    ]);
    const completion = evaluateBoundaryCompletion(census);
    assert.equal(completion.complete, false);
    assert.match(completion.errors.join('\n'), /unmapped=4/i);
  });
});

test('resolves generated import provenance at each call site when lexical bindings shadow aliases', () => {
  withFixture({
    'frontend/src/types/generated-operations.ts': widgetGeneratedOperations,
    'frontend/src/shadowed-generated.ts': `
      import { executeGeneratedOperation as runGenerated } from '@/lib/api/generated-api-client';
      import { createWidgetOperation as createWidget } from '@/types/generated-operations';

      export const shadowExecutorParameter = (runGenerated: Function) =>
        runGenerated(createWidget, {});
      export const shadowDescriptorParameter = (createWidget: unknown) =>
        runGenerated(createWidget, {});
      export function shadowVarExecutor() {
        var runGenerated = () => fetch('/api/v1/widgets');
        return runGenerated(createWidget, {});
      }
      export function shadowLetDescriptor() {
        let createWidget = { id: 'fake' };
        return runGenerated(createWidget, {});
      }
      export function shadowConstExecutor() {
        const runGenerated = () => fetch('/api/v1/widgets');
        return runGenerated(createWidget, {});
      }
      export function shadowFunctionExecutor() {
        function runGenerated() { return fetch('/api/v1/widgets'); }
        return runGenerated(createWidget, {});
      }
      export function shadowClassDescriptor() {
        class createWidget {}
        return runGenerated(createWidget, {});
      }
      export function shadowBlockDescriptor() {
        if (true) {
          const createWidget = { id: 'fake' };
          return runGenerated(createWidget, {});
        }
      }
    `,
    'frontend/src/shadowed-import.ts': `
      import { executeGeneratedOperation as runGenerated } from '@/lib/api/generated-api-client';
      import { executeGeneratedOperation as runGenerated } from '@/test-doubles/generated-api-client';
      import { createWidgetOperation as createWidget } from '@/types/generated-operations';
      export const collidingImport = () => runGenerated(createWidget, {});
    `,
  }, (root) => {
    const census = buildBoundaryCensus({ repoRoot: root });
    const shadowedCalls = census.records.filter(({ callee }) => callee === 'runGenerated');

    assert.equal(shadowedCalls.length, 9);
    assert.ok(shadowedCalls.every(({ classification }) => classification === 'unmapped'));
    assert.deepEqual(
      shadowedCalls.reduce((counts, { mappingStatus }) => ({
        ...counts,
        [mappingStatus]: (counts[mappingStatus] ?? 0) + 1,
      }), {}),
      {
        'unbound-generated-executor': 5,
        'unbound-generated-descriptor': 4,
      },
    );
    assert.match(evaluateBoundaryCompletion(census).errors.join('\n'), /unmapped=9/i);
  });
});

test('generated binary navigation is inventoried only when its exact GET descriptor is bound', () => {
  const generatedOperations = `
    const defineGeneratedOperation = (descriptor: unknown) => descriptor;
    export const exportLoginLogsOperation = defineGeneratedOperation({
      id: "exportLoginLogs",
      method: "get",
      path: "/api/v1/admin/system/logs/login/export.xlsx",
      requestKind: "none",
      responseKind: "binary",
    });
    export const getWidgetsOperation = defineGeneratedOperation({
      id: "getWidgets",
      method: "get",
      path: "/api/v1/widgets",
      requestKind: "none",
      responseKind: "json",
    });
    export const mismappedLoginExportOperation = defineGeneratedOperation({
      id: "exportLoginLogs",
      method: "get",
      path: "/api/v1/admin/system/logs/privacy/export.xlsx",
      requestKind: "none",
      responseKind: "binary",
    });
  `;
  const exportPaths = {
    '/api/v1/admin/system/logs/login/export.xlsx': {
      get: { operationId: 'exportLoginLogs', responses: { 200: { description: 'xlsx' } } },
    },
    '/api/v1/admin/system/logs/privacy/export.xlsx': {
      get: { operationId: 'exportPrivacyLogs', responses: { 200: { description: 'xlsx' } } },
    },
  };

  withFixture({
    'frontend/src/types/generated-operations.ts': generatedOperations,
    'frontend/src/app/admin/system/logs/login/SystemLogsLoginClient.tsx': `
      import { requestFullExport } from '@/app/components/patterns/full-result-export';
      import { exportLoginLogsOperation } from '@/types/generated-operations';
      export const download = () => requestFullExport({
        operation: exportLoginLogsOperation,
        onTooMany: () => {},
      });
    `,
  }, (root) => {
    const [record] = buildBoundaryCensus({ repoRoot: root }).records;

    assert.equal(record.classification, 'special');
    assert.equal(record.specialCase, 'binary');
    assert.equal(record.transport, 'browser-navigation');
    assert.equal(record.method, 'get');
    assert.equal(record.target, '/api/v1/admin/system/logs/login/export.xlsx');
    assert.equal(record.operationId, 'exportLoginLogs');
    assert.equal(record.descriptorName, 'exportLoginLogsOperation');
  }, exportPaths);

  withFixture({
    'frontend/src/types/generated-operations.ts': generatedOperations,
    'frontend/src/app/admin/system/logs/login/WrongExportClient.tsx': `
      import { requestFullExport } from '@/app/components/patterns/full-result-export';
      import { getWidgetsOperation } from '@/types/generated-operations';
      export const download = () => requestFullExport({ operation: getWidgetsOperation });
    `,
    'frontend/src/app/admin/system/logs/login/RawExportClient.tsx': `
      export const download = () => window.location.assign(
        '/api/v1/admin/system/logs/login/export.xlsx',
      );
    `,
    'frontend/src/app/admin/system/logs/login/MismappedExportClient.tsx': `
      import { requestFullExport } from '@/app/components/patterns/full-result-export';
      import { mismappedLoginExportOperation } from '@/types/generated-operations';
      export const download = () => requestFullExport({
        operation: mismappedLoginExportOperation,
      });
    `,
    'frontend/src/app/admin/system/logs/login/ImpostorExportClient.tsx': `
      import { requestFullExport } from '@/app/components/patterns/full-result-export';
      const exportLoginLogsOperation = {
        id: 'exportLoginLogs',
        method: 'get',
        path: '/api/v1/admin/system/logs/login/export.xlsx',
        requestKind: 'none',
        responseKind: 'binary',
      };
      export const download = () => requestFullExport({ operation: exportLoginLogsOperation });
    `,
  }, (root) => {
    const records = buildBoundaryCensus({ repoRoot: root }).records;
    const wrong = records.find(({ file }) => file.endsWith('WrongExportClient.tsx'));
    const raw = records.find(({ file }) => file.endsWith('RawExportClient.tsx'));
    const mismapped = records.find(({ file }) => file.endsWith('MismappedExportClient.tsx'));
    const impostor = records.find(({ file }) => file.endsWith('ImpostorExportClient.tsx'));

    assert.equal(wrong?.classification, 'unmapped');
    assert.equal(wrong?.mappingStatus, 'invalid-binary-navigation-operation');
    assert.equal(raw?.classification, 'direct');
    assert.equal(raw?.transport, 'browser-navigation');
    assert.equal(mismapped?.classification, 'unmapped');
    assert.equal(mismapped?.mappingStatus, 'descriptor-operation-mismatch');
    assert.equal(impostor?.classification, 'unmapped');
    assert.equal(impostor?.mappingStatus, 'unresolved-target');
  }, exportPaths);
});

test('fails closed when lexical bindings shadow exact generated navigation helper imports', () => {
  const exportPath = '/api/v1/admin/system/logs/login/export.xlsx';
  withFixture({
    'frontend/src/types/generated-operations.ts': `
      const defineGeneratedOperation = (descriptor: unknown) => descriptor;
      export const exportLoginLogsOperation = defineGeneratedOperation({
        id: "exportLoginLogs",
        method: "get",
        path: "${exportPath}",
        requestKind: "none",
        responseKind: "binary",
      });
    `,
    'frontend/src/shadowed-full-export.ts': `
      import { requestFullExport as runExport } from '@/app/components/patterns/full-result-export';
      import { exportLoginLogsOperation } from '@/types/generated-operations';
      export const download = (runExport: Function) => runExport({
        operation: exportLoginLogsOperation,
      });
    `,
    'frontend/src/shadowed-download-navigation.ts': `
      import { navigateToDownload as navigate } from '@/lib/navigation/full-result-download';
      import { exportLoginLogsOperation } from '@/types/generated-operations';
      export function download() {
        const navigate = (operation: unknown) => operation;
        return navigate(exportLoginLogsOperation, {});
      }
    `,
  }, (root) => {
    const census = buildBoundaryCensus({ repoRoot: root });

    assert.equal(census.records.length, 2);
    assert.ok(census.records.every(({ classification }) => classification === 'unmapped'));
    assert.ok(census.records.every(({ mappingStatus }) => (
      mappingStatus === 'unbound-generated-navigation-helper'
    )));
    assert.ok(census.records.every(({ descriptorName }) => (
      descriptorName === 'exportLoginLogsOperation'
    )));
    assert.equal(census.summary.byClassification.special, 0);
    assert.match(evaluateBoundaryCompletion(census).errors.join('\n'), /unmapped=2/i);
  }, {
    [exportPath]: {
      get: { operationId: 'exportLoginLogs', responses: { 200: { description: 'xlsx' } } },
    },
  });
});

test('a new generated binary navigation remains an explicit ratchet violation', () => {
  const files = {
    'frontend/src/types/generated-operations.ts': `
      const defineGeneratedOperation = (descriptor: unknown) => descriptor;
      export const exportLoginLogsOperation = defineGeneratedOperation({
        id: "exportLoginLogs",
        method: "get",
        path: "/api/v1/admin/system/logs/login/export.xlsx",
        requestKind: "none",
        responseKind: "binary",
      });
    `,
    'frontend/src/app/admin/system/logs/login/SystemLogsLoginClient.tsx': `
      import { requestFullExport } from '@/app/components/patterns/full-result-export';
      import { exportLoginLogsOperation } from '@/types/generated-operations';
      export const download = () => requestFullExport({ operation: exportLoginLogsOperation });
    `,
  };
  const paths = {
    '/api/v1/admin/system/logs/login/export.xlsx': {
      get: { operationId: 'exportLoginLogs', responses: { 200: { description: 'xlsx' } } },
    },
  };

  withFixture(files, (root) => {
    const baseline = buildBoundaryCensus({ repoRoot: root });
    writeFileSync(
      join(root, 'frontend/src/app/admin/system/logs/login/AnotherExportClient.tsx'),
      files['frontend/src/app/admin/system/logs/login/SystemLogsLoginClient.tsx'],
    );
    const withNewNavigation = buildBoundaryCensus({ repoRoot: root });

    assert.match(
      compareBoundaryCensus(baseline, withNewNavigation).join('\n'),
      /new special boundary.*\/api\/v1\/admin\/system\/logs\/login\/export\.xlsx/i,
    );
  }, paths);
});

test('resolves a relative import of the shared API client and inventories every raw call', () => {
  withFixture({
    'frontend/src/lib/api/client.ts': `
      export default {
        get: (path: string) => Promise.resolve(path),
        delete: (path: string) => Promise.resolve(path),
      };
    `,
    'frontend/src/lib/api/survey.ts': `
      import client from './client';
      export const list = () => client.get('/admin/system/survey-responses');
      export const detail = (id: number) => client.get(\`/admin/system/survey-responses/\${id}\`);
      export const remove = (id: number) => client.delete(\`/admin/system/survey-responses/\${id}\`);
      export const stats = (id: number) => client.get(\`/surveys/\${id}/stats\`);
    `,
  }, (root) => {
    const census = buildBoundaryCensus({ repoRoot: root });
    const surveyCalls = census.records.filter(({ file }) => file === 'frontend/src/lib/api/survey.ts');

    assert.equal(surveyCalls.length, 4);
    assert.deepEqual(surveyCalls.map(({ classification }) => classification), [
      'direct',
      'direct',
      'direct',
      'direct',
    ]);
    assert.deepEqual(surveyCalls.map(({ operationId }) => operationId), [
      'getResponses',
      'getResponse',
      'deleteResponse',
      'getStats',
    ]);
  }, {
    '/api/v1/admin/system/survey-responses': {
      get: { operationId: 'getResponses', responses: { 200: { description: 'ok' } } },
    },
    '/api/v1/admin/system/survey-responses/{srvyRspnsSn}': {
      get: { operationId: 'getResponse', responses: { 200: { description: 'ok' } } },
      delete: { operationId: 'deleteResponse', responses: { 200: { description: 'ok' } } },
    },
    '/api/v1/surveys/{srvySn}/stats': {
      get: { operationId: 'getStats', responses: { 200: { description: 'ok' } } },
    },
  });
});

test('inventories window and globalThis fetch while failing closed for indirect fetch callees', () => {
  withFixture({
    'frontend/src/lib/browser-fetch.ts': `
      export const loadWithWindow = () => window.fetch('/api/v1/widgets');
      export const loadWithGlobalThis = () => globalThis.fetch('/api/v1/healthz');

      const fetchAlias = window.fetch;
      export const loadWithAlias = () => fetchAlias('/api/v1/widgets');

      export const loadDynamically = (transportName: 'fetch') =>
        globalThis[transportName]('/api/v1/healthz');
    `,
  }, (root) => {
    const census = buildBoundaryCensus({ repoRoot: root });

    assert.deepEqual(validateBoundaryCensus(census), []);
    assert.equal(census.records.length, 4);
    assert.deepEqual(
      census.records.map(({ callee, classification, mappingStatus, method, operationId, transport }) => ({
        callee,
        classification,
        mappingStatus,
        method,
        operationId,
        transport,
      })),
      [
        {
          callee: 'window.fetch',
          classification: 'direct',
          mappingStatus: 'openapi-route',
          method: 'get',
          operationId: 'getWidgets',
          transport: 'fetch',
        },
        {
          callee: 'globalThis.fetch',
          classification: 'direct',
          mappingStatus: 'openapi-route',
          method: 'get',
          operationId: 'healthz',
          transport: 'fetch',
        },
        {
          callee: 'fetchAlias',
          classification: 'unmapped',
          mappingStatus: 'unresolved-target',
          method: null,
          operationId: null,
          transport: 'fetch-alias',
        },
        {
          callee: 'globalThis[transportName]',
          classification: 'unmapped',
          mappingStatus: 'unresolved-target',
          method: null,
          operationId: null,
          transport: 'dynamic-global-callee',
        },
      ],
    );
    assert.deepEqual(census.records.map(({ target }) => target), [
      '/api/v1/widgets',
      '/api/v1/healthz',
      '/api/v1/widgets',
      '/api/v1/healthz',
    ]);
    assert.equal(census.summary.complete, false);
  });
});

test('includes production mjs and cjs modules in the HTTP boundary denominator', () => {
  withFixture({
    'frontend/src/rogue-browser.mjs': `
      export const load = () => window.fetch('/api/v1/healthz');
    `,
    'frontend/src/rogue-browser.cjs': `
      exports.load = () => window.fetch('/api/v1/healthz');
    `,
  }, (root) => {
    const census = buildBoundaryCensus({ repoRoot: root });

    assert.deepEqual(census.records.map(({ file }) => file), [
      'frontend/src/rogue-browser.cjs',
      'frontend/src/rogue-browser.mjs',
    ]);
    assert.ok(census.records.every(({ classification }) => classification === 'direct'));
    assert.match(evaluateBoundaryCompletion(census).errors.join('\n'), /direct=2/i);
  });
});

test('inventories raw API navigation via location href and window open without counting page navigation', () => {
  const exportPath = '/api/v1/admin/system/logs/login/export.xlsx';
  withFixture({
    'frontend/src/app/admin/system/logs/login/RawNavigationClient.tsx': `
      export const downloadWithHref = () => {
        window.location.href = '${exportPath}?format=xlsx';
      };
      export const downloadWithOpen = () => window.open('${exportPath}', '_blank');
      export const downloadWithWindowAssign = () => window.location.assign('${exportPath}');
      export const downloadWithWindowReplace = () => window.location.replace('${exportPath}');
      export const downloadWithGlobalAssign = () => globalThis.location.assign('${exportPath}');
      export const downloadWithGlobalReplace = () => globalThis.location.replace('${exportPath}');
      export const navigateWithinApp = () => {
        window.location.href = '/login?expired=true';
        window.open('https://docs.example.com/help', '_blank');
        window.location.assign('/login?expired=true');
        window.location.replace('https://docs.example.com/help');
        globalThis.location.assign('/login?expired=true');
        globalThis.location.replace('https://docs.example.com/help');
      };
    `,
  }, (root) => {
    const census = buildBoundaryCensus({ repoRoot: root });

    assert.deepEqual(validateBoundaryCensus(census), []);
    assert.equal(census.records.length, 6);
    assert.equal(census.summary.complete, false);
    assert.deepEqual(
      census.records.map(({ callee, classification, mappingStatus, method, operationId, target, transport }) => ({
        callee,
        classification,
        mappingStatus,
        method,
        operationId,
        target,
        transport,
      })),
      [
        {
          callee: 'window.location.href',
          classification: 'direct',
          mappingStatus: 'openapi-route',
          method: 'get',
          operationId: 'exportLoginLogs',
          target: exportPath,
          transport: 'browser-navigation',
        },
        {
          callee: 'window.open',
          classification: 'direct',
          mappingStatus: 'openapi-route',
          method: 'get',
          operationId: 'exportLoginLogs',
          target: exportPath,
          transport: 'browser-navigation',
        },
        ...[
          'window.location.assign',
          'window.location.replace',
          'globalThis.location.assign',
          'globalThis.location.replace',
        ].map((callee) => ({
          callee,
          classification: 'direct',
          mappingStatus: 'openapi-route',
          method: 'get',
          operationId: 'exportLoginLogs',
          target: exportPath,
          transport: 'browser-navigation',
        })),
      ],
    );
  }, {
    [exportPath]: {
      get: { operationId: 'exportLoginLogs', responses: { 200: { description: 'xlsx' } } },
    },
  });
});

test('completion is explicit and cannot be inferred from a green baseline ratchet', () => {
  withFixture({
    'frontend/src/services/LegacyWidgetService.ts': `
      import { ApiService } from '@/services/core/ApiService';
      class LegacyWidgetService extends ApiService {
        constructor() { super('/widgets'); }
        list() { return this.get(''); }
      }
    `,
  }, (root) => {
    const result = evaluateBoundaryCompletion(buildBoundaryCensus({ repoRoot: root }));
    assert.equal(result.complete, false);
    assert.match(result.errors.join('\n'), /legacy=1/i);

    const weakened = buildBoundaryCensus({ repoRoot: root });
    weakened.target.maxLegacy = 1;
    assert.match(validateBoundaryCensus(weakened).join('\n'), /completion target was weakened/i);
  });
});

test('fails closed when a production source cannot be parsed', () => {
  withFixture({
    'frontend/src/broken.ts': `export const broken = "unterminated;\nfetch('/api/v1/healthz');`,
  }, (root) => {
    assert.throws(
      () => buildBoundaryCensus({ repoRoot: root }),
      /could not parse production source.*broken\.ts/i,
    );
  });
});

test('tracked repository snapshot is exact and reports current completion honestly', () => {
  const expected = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const actual = buildBoundaryCensus({ repoRoot });

  assert.deepEqual(validateBoundaryCensus(expected), []);
  assert.deepEqual(validateBoundaryCensus(actual), []);
  assert.deepEqual(compareBoundaryCensus(expected, actual), []);
  assert.equal(actual.scope.generatedDescriptorCount, actual.scope.openApiOperationCount);
  assert.equal(actual.summary.complete, true);
  assert.equal(actual.summary.complete, evaluateBoundaryCompletion(actual).complete);
});
