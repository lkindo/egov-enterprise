import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { createHash } from 'node:crypto';
import { publishReleaseImages, runDocker, scanReleaseImages, validateImageScan, validateReleaseManifest, verifyReleaseImages,
  verifyReleaseScanEvidence, validateImageArchive, readImageArchive, RELEASE_SCANNER_IMAGE, RELEASE_SCAN_RECEIPT } from './release-images.mjs';
import { runSmokeStages, smokeCommand, rawSmokeRequest, validateEncodedSmokeProbe, validateSmokeTableCounts,
  validateSmokeSessionCookies, validateSmokeManagementBoundary,
  internalSmokeHttp, containerSmokeRequest, INTERNAL_SMOKE_HTTP_SCRIPT, probeDirectApiEncodedPaths } from './run-isolated-release-smoke.mjs';

test('production smoke requires protected nonempty access and refresh cookies without exposing values', () => {
  const privateValue = 'fixture-private-session';
  const valid = ['accessToken', 'refreshToken'].map(name => `${name}=${privateValue}; Path=/; HttpOnly; Secure; SameSite=Strict`);
  validateSmokeSessionCookies([...valid, 'session_exp=1; Secure; SameSite=Strict']);
  const rejected = [];
  for (const name of ['refreshToken', 'accessToken']) {
    for (const attribute of ['; HttpOnly', '; Secure', '; SameSite=Strict']) {
      rejected.push(valid.map(cookie => cookie.startsWith(`${name}=`) ? cookie.replace(attribute, '') : cookie));
    }
    rejected.push(valid.map(cookie => cookie.startsWith(`${name}=`) ? cookie.replace(privateValue, '') : cookie));
    rejected.push(valid.map(cookie => cookie.startsWith(`${name}=`) ? cookie.replace(privateValue, '   ') : cookie));
    rejected.push(valid.filter(cookie => !cookie.startsWith(`${name}=`)));
    rejected.push([...valid, valid.find(cookie => cookie.startsWith(`${name}=`))]);
  }
  for (const cookies of rejected) {
    assert.throws(() => validateSmokeSessionCookies(cookies), error => {
      assert.equal(error.message.includes(privateValue), false);
      return /session cookie contract/u.test(error.message);
    }, 'an invalid cookie contract must fail without printing cookies');
  }
});

test('production smoke management boundary requires the separated public health route to be absent', () => {
  validateSmokeManagementBoundary(404);
  for (const status of [500, 502, 503, 200, 204, 301, 302, 400, 401, 403, 429, undefined, '404']) {
    assert.throws(() => validateSmokeManagementBoundary(status), /management health/u, `status ${status}`);
  }
});

test('encoded smoke requires a routing rejection, not a successful empty response or server outage', () => {
  for (const status of [400, 404]) validateEncodedSmokeProbe({ status, exposesToken: false, rawPathPreserved: true });
  for (const status of [200, 204, 302, 401, 403, 429, 500, 503]) {
    assert.throws(() => validateEncodedSmokeProbe({ status, exposesToken: false, rawPathPreserved: true }), `status ${status}`);
  }
  assert.throws(() => validateEncodedSmokeProbe({ status: 400, exposesToken: true, rawPathPreserved: true }));
  assert.throws(() => validateEncodedSmokeProbe({ status: 400, exposesToken: false, rawPathPreserved: false }));
});

test('direct API encoded probes establish fresh rotated sessions and return only safe observations', async () => {
  const paths = ['/api/v1/auth/%2572eissue', '/api/v1/%2561uth/login', '/api/v1/auth/%ZZreissue'];
  const calls = []; let round = 0;
  const loginBody = '{"userId":"fixture-user","password":"fixture-private-password"}';
  const result = await probeDirectApiEncodedPaths(async (route, options) => {
    calls.push(route);
    assert.equal(options.headers?.Origin, undefined); assert.equal(options.headers?.['X-Forwarded-For'], undefined);
    const tokenResponse = prefix => ({ response: new Response(JSON.stringify({ success: true, data: { accessToken: `${prefix}-access-${round}` } }),
      { status: 200, headers: { 'Set-Cookie': `refreshToken=${prefix}-refresh-${round}; HttpOnly; Secure; SameSite=Strict` } }), rawPathPreserved: true });
    if (route === '/api/v1/auth/login') {
      round += 1; assert.equal(options.body, loginBody); assert.equal(options.method, 'POST');
      return tokenResponse('login');
    }
    if (route === '/api/v1/auth/reissue') {
      assert.equal(options.headers.Cookie, `refreshToken=login-refresh-${round}`); assert.equal(options.method, 'POST');
      return tokenResponse('rotated');
    }
    assert.equal(options.headers.Authorization, `Bearer rotated-access-${round}`);
    assert.equal(options.headers.Cookie, `refreshToken=rotated-refresh-${round}`);
    if (route === '/api/v1/auth/me') return { response: new Response('{"privateUserField":"must-not-be-recorded"}', { status: 200 }), rawPathPreserved: true };
    assert.equal(route, paths[round - 1]); assert.equal(options.body, loginBody); assert.equal(options.method, 'POST');
    return { response: new Response('{"message":"private response details"}', { status: round === 2 ? 404 : 400 }), rawPathPreserved: true };
  }, loginBody);
  assert.deepEqual(calls, paths.flatMap(path => ['/api/v1/auth/login', '/api/v1/auth/reissue', '/api/v1/auth/me', path]));
  assert.deepEqual(result, paths.map((path, index) => ({ path, controls: { login: 200, refresh: 200, session: 200 },
    status: index === 1 ? 404 : 400, exposesToken: false, rawPathPreserved: true })));
  for (const privateValue of ['fixture-private-password', 'login-access', 'login-refresh', 'rotated-access', 'rotated-refresh',
    'privateUserField', 'private response details']) assert.equal(JSON.stringify(result).includes(privateValue), false);
});

test('direct API encoded probes stop on invalid controls and never accept authentication, rate-limit or token responses', async () => {
  for (const scenario of [
    { stage: 0, status: 401 }, { stage: 1, status: 401 }, { stage: 1, status: 429 }, { stage: 2, status: 401 },
    { stage: 0, status: 200, noAccess: true }, { stage: 1, status: 200, noCookie: true },
    { stage: 1, status: 200, bodyRefresh: true }, { stage: 2, status: 200, normalized: true },
    ...[200, 204, 401, 403, 429, 500, 503].map(status => ({ stage: 3, status })),
    { stage: 3, status: 400, exposed: true }, { stage: 3, status: 400, normalized: true },
  ]) {
    let calls = 0;
    await assert.rejects(probeDirectApiEncodedPaths(async () => {
      const index = calls++; assert.ok(index <= scenario.stage, 'a failed control must not reach the next request');
      const changed = index === scenario.stage; const status = changed ? scenario.status : 200;
      const value = { success: true, data: index < 2 ? { accessToken: `fixture-access-${index}` } : {} };
      if (changed && scenario.noAccess) delete value.data.accessToken;
      if (changed && (scenario.bodyRefresh || scenario.exposed)) value.data.refreshToken = 'fixture-private-refresh';
      const headers = index < 2 && !(changed && scenario.noCookie) ? { 'Set-Cookie': `refreshToken=fixture-${index}; HttpOnly` } : {};
      return { response: new Response(status === 204 ? null : JSON.stringify(value), { status, headers }),
        rawPathPreserved: !(changed && scenario.normalized) };
    }, '{"password":"fixture-private-password"}'), /direct API .* (?:failed|contract failed)|encoded Spring path/u);
    assert.equal(calls, scenario.stage + 1);
  }
});

test('database count evidence rejects missing XPath values and compares table names independently of JSON key order', () => {
  const valid = { tb_empty: 0, flyway_schema_history: 3 };
  assert.deepEqual(validateSmokeTableCounts(valid), { flyway_schema_history: 3, tb_empty: 0 });
  for (const invalid of [null, {}, { flyway_schema_history: 0 }, { flyway_schema_history: null },
    { flyway_schema_history: '3' }, { flyway_schema_history: 3, tb_empty: null },
    { flyway_schema_history: 3, tb_empty: -1 }, { flyway_schema_history: 3, tb_empty: 0.5 },
    { flyway_schema_history: 3, tb_empty: Number.MAX_SAFE_INTEGER + 1 }]) {
    assert.throws(() => validateSmokeTableCounts(invalid));
  }
  assert.equal(JSON.stringify(validateSmokeTableCounts(valid)), JSON.stringify(validateSmokeTableCounts({ flyway_schema_history: 3, tb_empty: 0 })));
});

test('smoke HTTP probes preserve encoded request targets on the wire and return token presence only', async () => {
  const received = [];
  const server = createServer((request, response) => {
    received.push(request.url);
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ data: { accessToken: 'synthetic-value-that-must-not-be-returned' } }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    for (const target of ['/api/v1/auth/%2572eissue', '/api/v1/%2561uth/login', '/api/v1/auth/%ZZreissue']) {
      const result = await rawSmokeRequest(origin, target);
      assert.deepEqual(result, { status: 200, exposesToken: true, rawPathPreserved: true });
      assert.equal(received.at(-1), target);
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('internal smoke transport preserves raw paths, multipart bytes and separate cookies over actual HTTP', async () => {
  const received = [];
  const server = createServer((request, response) => {
    const chunks = [];
    request.on('data', chunk => chunks.push(chunk));
    request.on('end', () => {
      received.push({ path: request.url, headers: request.headers, body: Buffer.concat(chunks) });
      if (request.url === '/oversized-response') { response.end(Buffer.alloc(4 * 1024 * 1024 + 1)); return; }
      response.setHeader('Set-Cookie', ['accessToken=fixture-access; HttpOnly; Secure; SameSite=Strict',
        'refreshToken=fixture-refresh; HttpOnly; Secure; SameSite=Strict']);
      response.end('fixture-response');
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const ownedId = 'a'.repeat(64); const inspections = [];
  const runtime = { verifyNetwork: () => inspections.push('network'), inspect: (service, running) => {
    assert.equal(running, true); inspections.push(service); return { Id: ownedId };
  } };
  const runChild = (source, input) => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['-e', source], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    const output = [];
    child.stdout.on('data', chunk => output.push(chunk)); child.stderr.resume();
    child.on('error', reject);
    child.on('close', status => status === 0 ? resolve(Buffer.concat(output).toString()) : reject(new Error('fixture transport child failed')));
    child.stdin.end(input);
  });
  // Only the test's node:http connection is redirected to its owned loopback server; the exact stdin worker executes.
  const adapter = `const http = require('node:http'); const original = http.request;
    http.request = (options, callback) => { if (!['api','edge'].includes(options.hostname) || options.port !== 8080) throw Error('target');
      return original({ ...options, hostname: '127.0.0.1', port: ${server.address().port}, headers: { ...options.headers, host: options.hostname + ':8080' } }, callback); };`;
  const docker = async (args, options) => {
    assert.deepEqual(args.slice(0, 5), ['exec', '-i', ownedId, 'node', '-e']);
    assert.equal(args[5], INTERNAL_SMOKE_HTTP_SCRIPT); assert.equal(options.timeout, 20000); assert.equal(options.maxBuffer, 8 * 1024 * 1024);
    assert.equal(args.some(value => value.includes('fixture-password') || value.includes('fixture-cookie')), false);
    return runChild(adapter + args[5], options.input);
  };
  try {
    for (const rawPath of ['/api/v1/auth/%2572eissue', '/api/v1/%2561uth/login', '/api/v1/auth/%ZZreissue']) {
      const result = await containerSmokeRequest(runtime, docker, 'edge', rawPath, { method: 'POST',
        headers: { Origin: 'http://edge:8080', Cookie: 'fixture-cookie', 'Content-Type': 'application/json' }, body: '{"password":"fixture-password"}' });
      assert.equal(received.at(-1).path, rawPath); assert.equal(received.at(-1).headers.host, 'edge:8080');
      assert.equal(received.at(-1).headers.origin, 'http://edge:8080');
      assert.equal(received.at(-1).body.toString(), '{"password":"fixture-password"}');
      assert.equal(result.rawPathPreserved, true);
      assert.deepEqual(result.response.headers.getSetCookie(), ['accessToken=fixture-access; HttpOnly; Secure; SameSite=Strict',
        'refreshToken=fixture-refresh; HttpOnly; Secure; SameSite=Strict']);
      assert.equal(await result.response.text(), 'fixture-response');
    }
    const form = new FormData(); form.append('files', new Blob(['fixture-upload']), 'smoke.txt');
    await containerSmokeRequest(runtime, docker, 'edge', '/api/v1/files', { method: 'POST', body: form });
    const uploaded = received.at(-1); const boundary = uploaded.headers['content-type'].split('boundary=')[1];
    assert.ok(boundary); assert.ok(uploaded.body.includes(Buffer.from(`--${boundary}`)));
    assert.ok(uploaded.body.includes(Buffer.from('filename="smoke.txt"'))); assert.ok(uploaded.body.includes(Buffer.from('fixture-upload')));
    await containerSmokeRequest(runtime, docker, 'api', '/api/v1/auth/login', { method: 'POST', body: '{}' });
    assert.equal(received.at(-1).headers.origin, undefined); assert.equal(received.at(-1).headers['x-forwarded-for'], undefined);
    await assert.rejects(containerSmokeRequest(runtime, docker, 'edge', '/oversized-response'), /internal HTTP command failed; raw output withheld/u);
    assert.deepEqual(inspections.slice(0, 3), ['network', 'edge', 'frontend']);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('internal smoke HTTP refuses foreign targets, header injection, invalid raw paths and request bodies before connecting', async () => {
  const valid = { target: 'edge', rawPath: '/api/v1/auth/%ZZreissue', method: 'POST', headers: [], bodyBase64: '' };
  for (const change of [
    value => { value.target = 'remote.invalid'; }, value => { value.target = '127.0.0.1'; },
    value => { value.rawPath = '//remote.invalid/'; }, value => { value.rawPath = '/x\r\nHost: remote'; },
    value => { value.rawPath = 'http://remote.invalid'; }, value => { value.rawPath = '/' + 'a'.repeat(8192); },
    value => { value.method = 'CONNECT'; }, value => { value.headers = [['Host', 'remote.invalid']]; },
    value => { value.headers = [['X-Test', 'value\r\nCookie: fixture']]; },
    value => { value.headers = [['Cookie', 'a'], ['cookie', 'b']]; },
    value => { value.bodyBase64 = '%invalid'; }, value => { value.bodyBase64 = Buffer.alloc(1024 * 1024 + 1).toString('base64'); },
  ]) {
    const changed = structuredClone(valid); change(changed);
    let connected = false;
    await assert.rejects(internalSmokeHttp(changed, () => { connected = true; throw new Error('fixture connection'); }), /internal HTTP probe failed/u);
    assert.equal(connected, false, 'invalid payload must be rejected before connecting');
  }
  const runtime = { verifyNetwork: () => {}, inspect: () => { throw new Error('unowned'); } };
  await assert.rejects(containerSmokeRequest(runtime, () => assert.fail('unowned executor'), 'edge', '/'), /unowned/u);
  await assert.rejects(containerSmokeRequest(runtime, () => assert.fail('foreign target'), 'remote.invalid', '/'), /not owned/u);
  await assert.rejects(containerSmokeRequest({ verifyNetwork: () => {}, inspect: () => ({ Id: 'a'.repeat(64) }) },
    () => assert.fail('oversized body must not reach exec'), 'edge', '/', { method: 'POST', body: Buffer.alloc(1024 * 1024 + 1) }), /too large/u);
});

test('internal smoke response decoding fails on malformed, oversized or path-normalized replies', async () => {
  const runtime = { verifyNetwork: () => {}, inspect: () => ({ Id: 'a'.repeat(64) }) };
  const normal = { status: 200, rawHeaders: [], bodyBase64: '', rawPathPreserved: true };
  for (const changed of [null, { ...normal, status: 101 }, { ...normal, rawPathPreserved: false },
    { ...normal, rawHeaders: ['Set-Cookie'] }, { ...normal, bodyBase64: '%invalid' },
    { ...normal, bodyBase64: Buffer.alloc(4 * 1024 * 1024 + 1).toString('base64') }]) {
    await assert.rejects(containerSmokeRequest(runtime, () => JSON.stringify(changed), 'edge', '/'), /invalid internal HTTP response/u);
  }
  await assert.rejects(containerSmokeRequest(runtime, () => 'fixture-private-invalid-json', 'edge', '/'),
    { message: 'Isolated release smoke: internal HTTP command failed; raw output withheld.' });
});

test('internal smoke HTTP caps responses and enforces its deadline without accepting partial replies', async () => {
  const input = { target: 'api', rawPath: '/', method: 'GET', headers: [], bodyBase64: '' };
  for (const scenario of ['oversized', 'timeout', 'aborted']) {
    let deadline; let destroyed = false;
    const request = (_options, receive) => {
      const outgoing = new EventEmitter(); outgoing.path = '/'; outgoing.destroy = () => { destroyed = true; };
      outgoing.end = () => queueMicrotask(() => {
        if (scenario === 'timeout') { deadline(); return; }
        const incoming = new EventEmitter(); incoming.statusCode = 200; incoming.rawHeaders = [];
        receive(incoming);
        if (scenario === 'aborted') incoming.emit('aborted');
        else { incoming.emit('data', Buffer.alloc(4 * 1024 * 1024 + 1)); incoming.emit('end'); }
      });
      return outgoing;
    };
    await assert.rejects(internalSmokeHttp(input, request, {
      setTimeout: (callback, milliseconds) => { assert.equal(milliseconds, 15000); deadline = callback; return 1; }, clearTimeout: () => {},
    }), /internal HTTP probe failed/u);
    assert.equal(destroyed, true);
  }
});

test('internal smoke stdin worker fails closed as a real process without returning private payloads', () => {
  for (const input of ['{"password":"fixture-private"', JSON.stringify({ target: 'remote.invalid', rawPath: '/', method: 'GET',
    headers: [], bodyBase64: '' }), 'x'.repeat(2 * 1024 * 1024 + 1)]) {
    assert.throws(() => smokeCommand('docker', ['-e', INTERNAL_SMOKE_HTTP_SCRIPT], {
      executable: process.execPath, input, timeout: 5000, maxBuffer: 1024,
    }), { message: 'Isolated release smoke: command failed; raw output withheld.' });
  }
});

test('isolated smoke completes both production lifecycles and cleanup before evidence can exist', async () => {
  const calls = [];
  const names = ['prepare', 'bootstrap', 'production', 'http', 'backup', 'restore', 'verifyRestored', 'cleanup', 'evidence'];
  await runSmokeStages(Object.fromEntries(names.map(name => [name, async () => { calls.push(name); }])));
  assert.deepEqual(calls, names);
  for (const failAt of names.slice(0, -1)) {
    const failedCalls = [];
    await assert.rejects(runSmokeStages(Object.fromEntries(names.map(name => [name, async () => {
      failedCalls.push(name); if (name === failAt) throw new Error('synthetic stage failure');
    }]))));
    assert.equal(failedCalls.includes('evidence'), false);
    assert.equal(failedCalls.includes('cleanup'), true);
  }
});

test('a failed real smoke command is redacted and prevents subsequent restore and completion evidence', async () => {
  const calls = [];
  const operations = Object.fromEntries(['prepare', 'bootstrap', 'production', 'http', 'backup', 'restore', 'verifyRestored', 'cleanup', 'evidence']
    .map(name => [name, async () => { calls.push(name); } ]));
  operations.backup = async () => {
    calls.push('backup');
    smokeCommand('docker', ['-e', 'process.stderr.write("fixture-private-diagnostic"); process.exit(9)'], { executable: process.execPath });
  };
  await assert.rejects(runSmokeStages(operations), { message: 'Isolated release smoke: command failed; raw output withheld.' });
  assert.deepEqual(calls, ['prepare', 'bootstrap', 'production', 'http', 'backup', 'cleanup']);
});

function archiveTar(entries) {
  const blocks = [];
  for (const { name, bytes, type = '0' } of entries) {
    const body = Buffer.from(bytes); const header = Buffer.alloc(512);
    header.write(name, 0, 100, 'utf8'); header.write('0000600\0', 100); header.write('0000000\0', 108);
    header.write('0000000\0', 116); header.write(body.length.toString(8).padStart(11, '0') + '\0', 124);
    header.write('00000000000\0', 136); header.fill(32, 148, 156); header.write(type, 156);
    header.write('ustar\0', 257); header.write('00', 263);
    header.write([...header].reduce((sum, byte) => sum + byte, 0).toString(8).padStart(6, '0') + '\0 ', 148);
    blocks.push(header, body, Buffer.alloc((512 - body.length % 512) % 512));
  }
  return Buffer.concat([...blocks, Buffer.alloc(1024)]);
}

function releaseArchiveFixture(role, { classic = false, extraPlatform = false } = {}) {
  const sha = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
  const json = value => Buffer.from(JSON.stringify(value)); const entries = [];
  const blob = (bytes, mediaType) => {
    const digest = sha(bytes); const name = `blobs/sha256/${digest.slice(7)}`;
    if (!entries.some(entry => entry.name === name)) entries.push({ name, bytes });
    return { mediaType, digest, size: bytes.length };
  };
  const layerBytes = ['base', 'runtime'].map(name => archiveTar([{ name, bytes: `${role}-${name}` }]));
  const diffIds = layerBytes.map(sha);
  const configBytes = json({ architecture: 'amd64', os: 'linux', rootfs: { type: 'layers', diff_ids: diffIds },
    config: { Env: ['FIXTURE_PRIVATE=must-not-reach-receipt'], Labels: { role } } });
  const configId = sha(configBytes);
  if (classic) {
    entries.push({ name: `${configId.slice(7)}.json`, bytes: configBytes },
      ...layerBytes.map((bytes, index) => ({ name: `${diffIds[index].slice(7)}/layer.tar`, bytes })),
      { name: 'manifest.json', bytes: json([{ Config: `${configId.slice(7)}.json`, RepoTags: null,
        Layers: diffIds.map(id => `${id.slice(7)}/layer.tar`) }]) });
    return { imageId: configId, configId, diffIds, entries, bytes: archiveTar(entries) };
  }
  const layers = layerBytes.map(bytes => blob(bytes, 'application/vnd.oci.image.layer.v1.tar'));
  const config = blob(configBytes, 'application/vnd.oci.image.config.v1+json');
  const manifest = blob(json({ schemaVersion: 2, mediaType: 'application/vnd.oci.image.manifest.v1+json',
    config, layers }), 'application/vnd.oci.image.manifest.v1+json');
  const manifests = [{ ...manifest, platform: { os: 'linux', architecture: 'amd64' } }];
  if (extraPlatform) {
    const armConfig = blob(json({ architecture: 'arm64', os: 'linux', rootfs: { type: 'layers', diff_ids: diffIds } }),
      'application/vnd.oci.image.config.v1+json');
    manifests.push({ ...blob(json({ schemaVersion: 2, mediaType: 'application/vnd.oci.image.manifest.v1+json',
      config: armConfig, layers }), 'application/vnd.oci.image.manifest.v1+json'),
    platform: { os: 'linux', architecture: 'arm64' } });
  }
  const attestationConfig = blob(json({ os: 'unknown', architecture: 'unknown' }), 'application/vnd.oci.image.config.v1+json');
  const attestationLayer = blob(json({ fixture: true }), 'application/vnd.in-toto+json');
  const attestation = blob(json({ schemaVersion: 2, mediaType: 'application/vnd.oci.image.manifest.v1+json',
    config: attestationConfig, layers: [attestationLayer] }), 'application/vnd.oci.image.manifest.v1+json');
  manifests.push({ ...attestation, platform: { os: 'unknown', architecture: 'unknown' }, annotations: {
    'vnd.docker.reference.type': 'attestation-manifest', 'vnd.docker.reference.digest': manifest.digest } });
  const index = blob(json({ schemaVersion: 2, mediaType: 'application/vnd.oci.image.index.v1+json', manifests }),
    'application/vnd.oci.image.index.v1+json');
  entries.push({ name: 'index.json', bytes: json({ schemaVersion: 2, manifests: [index] }) },
    { name: 'oci-layout', bytes: json({ imageLayoutVersion: '1.0.0' }) },
    { name: 'manifest.json', bytes: json([{ Config: `blobs/sha256/${configId.slice(7)}`, RepoTags: null,
      Layers: layers.map(layer => `blobs/sha256/${layer.digest.slice(7)}`) }]) });
  return { imageId: index.digest, configId, diffIds, entries, bytes: archiveTar(entries) };
}

const revision = 'a'.repeat(40);
const imageArchives = ['api', 'frontend'].map(role => releaseArchiveFixture(role));
const ids = imageArchives.map(archive => archive.imageId);

test('saved OCI index binds one runnable platform, config and layers while preserving the published index ID', () => {
  const fixture = imageArchives[0]; const identity = validateImageArchive(fixture.bytes, fixture.imageId);
  assert.equal(identity.imageId, fixture.imageId); assert.equal(identity.configId, fixture.configId);
  assert.notEqual(identity.imageId, identity.configId);
  assert.deepEqual(identity.diffIds, fixture.diffIds);
  assert.deepEqual(identity.platform, { os: 'linux', architecture: 'amd64' });
  assert.equal(identity.archiveSha256, createHash('sha256').update(fixture.bytes).digest('hex'));
  assert.equal(JSON.stringify(identity).includes('FIXTURE_PRIVATE'), false);
  assert.throws(() => validateImageArchive(fixture.bytes, imageArchives[1].imageId), /scan evidence/u);
  const ambiguous = releaseArchiveFixture('ambiguous', { extraPlatform: true });
  assert.throws(() => validateImageArchive(ambiguous.bytes, ambiguous.imageId), /scan evidence/u);
});

test('every referenced OCI blob byte, descriptor size and Docker manifest selection is bound to the image', () => {
  const fixture = imageArchives[0];
  for (const target of fixture.entries.filter(entry => entry.name.startsWith('blobs/'))) {
    const bytes = Buffer.from(target.bytes); bytes[0] ^= 1;
    const changed = archiveTar(fixture.entries.map(entry => entry.name === target.name ? { ...entry, bytes } : entry));
    assert.throws(() => validateImageArchive(changed, fixture.imageId), /scan evidence/u, target.name);
  }
  for (const change of [
    entries => { const entry = entries.find(value => value.name === 'index.json'); const value = JSON.parse(entry.bytes);
      value.manifests[0].size += 1; entry.bytes = Buffer.from(JSON.stringify(value)); },
    entries => { const entry = entries.find(value => value.name === 'manifest.json'); const value = JSON.parse(entry.bytes);
      value[0].Config = `blobs/sha256/${imageArchives[1].configId.slice(7)}`; entry.bytes = Buffer.from(JSON.stringify(value)); },
    entries => { const entry = entries.find(value => value.name === 'manifest.json'); const value = JSON.parse(entry.bytes);
      value[0].Layers.reverse(); entry.bytes = Buffer.from(JSON.stringify(value)); },
    entries => { const entry = entries.find(value => value.name === 'manifest.json'); const value = JSON.parse(entry.bytes);
      value.push(value[0]); entry.bytes = Buffer.from(JSON.stringify(value)); },
  ]) {
    const entries = fixture.entries.map(entry => ({ ...entry, bytes: Buffer.from(entry.bytes) })); change(entries);
    assert.throws(() => validateImageArchive(archiveTar(entries), fixture.imageId), /scan evidence/u);
  }
});

test('classic Docker config identity still requires the actual ordered uncompressed layer bytes', () => {
  const fixture = releaseArchiveFixture('classic', { classic: true });
  const identity = validateImageArchive(fixture.bytes, fixture.imageId);
  assert.equal(identity.imageId, identity.configId); assert.equal(identity.manifestDigest, null);
  assert.deepEqual(identity.diffIds, fixture.diffIds);
  const changed = fixture.entries.map(entry => ({ ...entry, bytes: Buffer.from(entry.bytes) }));
  changed.find(entry => entry.name.endsWith('/layer.tar')).bytes[0] ^= 1;
  assert.throws(() => validateImageArchive(archiveTar(changed), fixture.imageId), /scan evidence/u);
});

test('tar identity rejects duplicate entries, traversal, links, unsupported headers and bounded-size violations without extraction', () => {
  const fixture = imageArchives[0];
  for (const extra of [
    fixture.entries[0], { name: '../escape', bytes: 'private' }, { name: '/absolute', bytes: 'private' },
    { name: 'C:\\escape', bytes: 'private' }, { name: 'blobs/sha256/../../escape', bytes: 'private' },
    ...['1', '2', 'x', 'g'].map(type => ({ name: 'repositories', bytes: '', type })),
  ]) assert.throws(() => validateImageArchive(archiveTar([...fixture.entries, extra]), fixture.imageId), /scan evidence/u);
  const invalidHeader = Buffer.from(fixture.bytes); invalidHeader[148] ^= 1;
  assert.throws(() => validateImageArchive(invalidHeader, fixture.imageId), /scan evidence/u);
  assert.throws(() => validateImageArchive(fixture.bytes.subarray(0, fixture.bytes.length - 1024), fixture.imageId), /scan evidence/u);
  assert.throws(() => validateImageArchive({ size: 4 * 1024 ** 3 + 512, read: () => assert.fail('oversized archive must not be read') }, fixture.imageId), /scan evidence/u);
  const largeMetadata = fixture.entries.map(entry => entry.name === 'manifest.json'
    ? { ...entry, bytes: Buffer.alloc(2 * 1024 * 1024 + 1, 32) } : entry);
  assert.throws(() => validateImageArchive(archiveTar(largeMetadata), fixture.imageId), /scan evidence/u);
});

const refs = [`ghcr.io/example/egov-api@sha256:${'3'.repeat(64)}`, `ghcr.io/example/egov-frontend@sha256:${'4'.repeat(64)}`];
const env = { GITHUB_SHA: revision, GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/tags/v1.2.3',
  RELEASE_NAMESPACE: 'example', BACKEND_TAGS: 'ghcr.io/example/egov-api:1.2.3',
  FRONTEND_TAGS: 'ghcr.io/example/egov-frontend:1.2.3', BACKEND_IMAGE_ID: ids[0], FRONTEND_IMAGE_ID: ids[1] };

const scannerMetadata = { Version: '0.74.0', VulnerabilityDB: { Version: 2,
  UpdatedAt: '2026-09-27T00:00:00Z', NextUpdate: '2026-09-28T00:00:00Z', DownloadedAt: '2026-09-27T01:00:00Z' } };
const scanReport = id => ({ SchemaVersion: 2, Trivy: { Version: '0.74.0' }, ArtifactType: 'container_image',
  CreatedAt: '2026-09-27T01:10:00Z', Metadata: { ImageID: id,
    DiffIDs: imageArchives.find(archive => archive.configId === id)?.diffIds ?? [] }, Results: [
    { Class: 'os-pkgs', Packages: [{ Name: 'synthetic-os-package' }] },
    { Class: 'lang-pkgs', Packages: [{ Name: 'synthetic-runtime-package' }] },
  ] });
const scanSbom = id => ({ bomFormat: 'CycloneDX', specVersion: '1.6', metadata: { timestamp: '2026-09-27T01:10:00Z',
  tools: { components: [{ group: 'aquasecurity', name: 'trivy', version: '0.74.0' }] },
  component: { type: 'container', properties: [{ name: 'aquasecurity:trivy:ImageID', value: id }] } },
  components: [{ type: 'library', name: 'synthetic-runtime-package' }] });

function scanEvidenceFixture() {
  const files = new Map();
  const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
  const images = ['api', 'frontend'].map((role, index) => {
    const report = `release-scan/output/${role}.vuln.json`; const sbom = `release-scan/output/${role}.cdx.json`;
    const archive = `release-scan/input/${role}.tar`; const fixture = imageArchives[index];
    files.set(archive, fixture.bytes);
    files.set(report, Buffer.from(JSON.stringify(scanReport(fixture.configId))));
    files.set(sbom, Buffer.from(JSON.stringify(scanSbom(fixture.configId))));
    return { role, imageId: ids[index], revision, report, sbom, reportSha256: sha256(files.get(report)), sbomSha256: sha256(files.get(sbom)),
      archive, archiveSha256: sha256(fixture.bytes), configId: fixture.configId };
  });
  files.set(RELEASE_SCAN_RECEIPT, Buffer.from(JSON.stringify({ schemaVersion: 1, revision, createdAt: '2026-09-27T01:20:00Z',
    runId: null, runAttempt: null, scannerImage: RELEASE_SCANNER_IMAGE, scannerImageId: `sha256:${'9'.repeat(64)}`, scanner: scannerMetadata, images })));
  return { files, read: file => { if (!files.has(file)) throw new Error('missing evidence file'); return files.get(file); },
    readArchive: (file, imageId) => validateImageArchive(files.get(file), imageId) };
}

function fixture({ failPush = 0, badId = false, badRevision = false, missingDigest = false } = {}) {
  const calls = [], writes = [];
  let pushes = 0;
  return { calls, writes, exists: () => false, ...scanEvidenceFixture(),
    write: (...args) => writes.push(args),
    run: (args) => {
      calls.push(args);
      const index = args[2].includes('frontend') || args[2] === ids[1] ? 1 : 0;
      if (args[1] === 'push') {
        pushes += 1;
        if (pushes === failPush) throw new Error('simulated command failure');
        return '';
      }
      if (args[4] === '{{.Id}}') return badId && index === 1 ? ids[0] : ids[index];
      if (args[4] === '{{json .RepoDigests}}') return JSON.stringify(missingDigest ? [] : [refs[index]]);
      return badRevision && index === 1 ? 'b'.repeat(40) : revision;
    } };
}

test('both built images are verified before the first push; manifest follows both successful pushes', () => {
  const runner = fixture();
  const manifest = publishReleaseImages(env, runner);
  assert.deepEqual(manifest, { schemaVersion: 1, revision, apiImage: refs[0], frontendImage: refs[1] });
  assert.equal(runner.calls.findIndex((args) => args[1] === 'push'), 4);
  assert.equal(runner.calls.filter((args) => args[1] === 'push').length, 2);
  assert.equal(runner.writes.length, 1);
  assert.equal(runner.writes[0][2].flag, 'wx');
});

test('publication rejects missing scan completion evidence before the first push', () => {
  const runner = fixture();
  assert.throws(() => publishReleaseImages(env, { ...runner, read: () => { throw new Error('missing receipt'); } }), /scan|evidence/u);
  assert.equal(runner.calls.some(args => args[1] === 'push'), false);
  assert.equal(runner.writes.length, 0);
});

test('changed image, missing or tampered reports, stale run and incomplete scan receipts prevent publication', () => {
  for (const mutate of [
    files => files.delete('release-scan/output/frontend.cdx.json'),
    files => files.set('release-scan/output/api.cdx.json', Buffer.from('{}')),
    files => { const receipt = JSON.parse(files.get(RELEASE_SCAN_RECEIPT)); receipt.images.pop(); files.set(RELEASE_SCAN_RECEIPT, JSON.stringify(receipt)); },
    files => { const receipt = JSON.parse(files.get(RELEASE_SCAN_RECEIPT)); receipt.images[1].imageId = ids[0]; files.set(RELEASE_SCAN_RECEIPT, JSON.stringify(receipt)); },
    files => { const receipt = JSON.parse(files.get(RELEASE_SCAN_RECEIPT)); receipt.runId = 'previous-run'; files.set(RELEASE_SCAN_RECEIPT, JSON.stringify(receipt)); },
    files => { const receipt = JSON.parse(files.get(RELEASE_SCAN_RECEIPT)); receipt.scannerImage = 'aquasec/trivy:latest'; files.set(RELEASE_SCAN_RECEIPT, JSON.stringify(receipt)); },
    files => { const receipt = JSON.parse(files.get(RELEASE_SCAN_RECEIPT)); delete receipt.scanner.VulnerabilityDB; files.set(RELEASE_SCAN_RECEIPT, JSON.stringify(receipt)); },
    files => { const receipt = JSON.parse(files.get(RELEASE_SCAN_RECEIPT)); receipt.images[0].configId = imageArchives[1].configId; files.set(RELEASE_SCAN_RECEIPT, JSON.stringify(receipt)); },
    files => { const receipt = JSON.parse(files.get(RELEASE_SCAN_RECEIPT)); receipt.images[0].archiveSha256 = '0'.repeat(64); files.set(RELEASE_SCAN_RECEIPT, JSON.stringify(receipt)); },
    files => { const receipt = JSON.parse(files.get(RELEASE_SCAN_RECEIPT)); receipt.images[0].archive = '../other.tar'; files.set(RELEASE_SCAN_RECEIPT, JSON.stringify(receipt)); },
    files => files.set('release-scan/input/api.tar', imageArchives[1].bytes),
    files => files.delete('release-scan/input/frontend.tar'),
  ]) {
    const runner = fixture(); mutate(runner.files);
    assert.throws(() => publishReleaseImages(env, runner), /scan evidence/u);
    assert.equal(runner.calls.some(args => args[1] === 'push'), false); assert.equal(runner.writes.length, 0);
  }
});

test('scan evidence consumes each receipt and report once and rejects malformed or blocking scanner output', () => {
  const fixture = scanEvidenceFixture(); const reads = [];
  const archivesRead = [];
  verifyReleaseScanEvidence(env, ids.map(id => ({ id })), file => { reads.push(file); return fixture.read(file); },
    (file, id) => { archivesRead.push(file); return fixture.readArchive(file, id); });
  assert.equal(new Set(reads).size, 5); assert.equal(reads.length, 5);
  assert.equal(new Set(archivesRead).size, 2); assert.equal(archivesRead.length, 2);
  const identity = validateImageArchive(imageArchives[0].bytes, ids[0]);
  for (const mutate of [
    (report) => { report.Metadata.ImageID = ids[1]; },
    (report) => { report.Metadata.DiffIDs.reverse(); },
    (report) => { report.Trivy.Version = 'unknown'; },
    (report) => { report.Results = []; },
    (report) => { report.Results.pop(); },
    (report) => { report.Results[0].Vulnerabilities = [{ Severity: 'HIGH', FixedVersion: '' }]; },
    (report) => { report.Results[1].Vulnerabilities = [{ Severity: 'CRITICAL' }]; },
    (report) => { report.Results[1].Vulnerabilities = {}; },
    (report) => { report.Results[0].ExperimentalModifiedFindings = [{}]; },
    (_report, sbom) => { sbom.metadata.component.properties[0].value = ids[1]; },
    (_report, sbom) => { sbom.components = []; },
    (_report, sbom) => { sbom.vulnerabilities = [{ id: 'synthetic-high' }]; },
  ]) { const report = structuredClone(scanReport(imageArchives[0].configId)); const sbom = scanSbom(imageArchives[0].configId); mutate(report, sbom);
    assert.throws(() => validateImageScan(report, sbom, identity), /scan evidence/u); }
  validateImageScan(scanReport(imageArchives[0].configId), scanSbom(imageArchives[0].configId), identity);
});

function temporaryScanRoot(t) {
  const base = resolve(tmpdir()); const root = mkdtempSync(join(base, 'egov-release-scan-'));
  t.after(() => { assert.ok(relative(base, root).startsWith('egov-release-scan-') && !relative(base, root).includes(sep)); rmSync(root, { recursive: true, force: true }); });
  return root;
}

function scannerFixture(root, { failScan = 0, badId = false } = {}) {
  const base = fixture(); let scans = 0; const calls = [];
  return { calls, run: args => {
    calls.push(args);
    if (args[0] === 'pull') return '';
    if (args[0] === 'image' && args[2] === RELEASE_SCANNER_IMAGE) return `sha256:${'9'.repeat(64)}`;
    if (args[1] === 'save') { writeFileSync(args[3], imageArchives[args.at(-1) === ids[0] ? 0 : 1].bytes); return ''; }
    if (args[0] !== 'run') return base.run(args);
    if (args.includes('version')) return JSON.stringify(scannerMetadata);
    scans += 1; if (scans === failScan) throw new Error('synthetic scanner failure');
    const role = args[args.indexOf('--input') + 1].includes('frontend') ? 'frontend' : 'api';
    const id = badId ? `sha256:${'8'.repeat(64)}` : imageArchives[role === 'api' ? 0 : 1].configId;
    const output = args[args.indexOf('--output') + 1].replace('/output/', 'release-scan/output/');
    writeFileSync(join(root, output), JSON.stringify(args[args.indexOf('--format') + 1] === 'json' ? scanReport(id) : scanSbom(id)));
    return '';
  } };
}

test('dry-run scans exact saved image IDs with isolated mounts and emits evidence only after both scans and SBOMs', t => {
  const root = temporaryScanRoot(t); const runner = scannerFixture(root);
  const receipt = scanReleaseImages({ ...env, GITHUB_EVENT_NAME: 'workflow_dispatch' }, { root, run: runner.run });
  assert.equal(receipt.images.length, 2);
  assert.deepEqual(runner.calls.filter(args => args[1] === 'save').map(args => args.at(-1)), ids);
  const scans = runner.calls.filter(args => args[0] === 'run' && !args.includes('version'));
  assert.equal(scans.length, 4);
  for (const args of scans) {
    assert.ok(args.includes(RELEASE_SCANNER_IMAGE)); assert.ok(args.includes('--read-only'));
    assert.equal(args[args.indexOf('--scanners') + 1], 'vuln');
    assert.equal(args[args.indexOf('--pkg-types') + 1], 'os,library');
    assert.equal(args[args.indexOf('--tmpfs') + 1], '/tmp:rw,noexec,nosuid,size=4g');
    assert.ok(args.includes('--list-all-pkgs'));
    assert.equal(args.includes('--include-dev-deps'), false, 'image scans installed packages; this flag is unsupported');
    assert.equal(args[args.indexOf('--exit-code') + 1], '1');
    assert.equal(args[args.indexOf('--severity') + 1], 'HIGH,CRITICAL');
    assert.equal(args[args.indexOf('--ignorefile') + 1], '/dev/null');
    assert.equal(args[args.indexOf('--config') + 1], '/dev/null');
    assert.ok(args.some(arg => arg.endsWith('target=/input,readonly')));
    assert.equal(args.filter(arg => arg.startsWith('type=bind,')).length, 3);
    assert.equal(args.some(arg => /docker\.sock|ignore-unfixed|skip-db-update/u.test(arg)), false);
  }
  assert.equal(runner.calls.some(args => args.includes('push') || args.includes('login')), false);
  assert.deepEqual(receipt.images.map(image => image.configId), imageArchives.map(image => image.configId));
  assert.equal(JSON.stringify(receipt).includes('FIXTURE_PRIVATE'), false);
  assert.equal(JSON.stringify(receipt).includes('must-not-reach-receipt'), false);
  verifyReleaseScanEvidence(env, ids.map(id => ({ id })), file => readFileSync(join(root, file)),
    (file, id) => readImageArchive(join(root, file), id));
});

for (const failScan of [1, 2, 3, 4]) test(`scanner command ${failScan} failure leaves no completion receipt`, t => {
  const root = temporaryScanRoot(t); const runner = scannerFixture(root, { failScan });
  assert.throws(() => scanReleaseImages(env, { root, run: runner.run }), /synthetic scanner failure/u);
  assert.throws(() => readFileSync(join(root, RELEASE_SCAN_RECEIPT)), /ENOENT/u);
});

test('wrong scanned image identity cannot create a completion receipt', t => {
  const root = temporaryScanRoot(t); const runner = scannerFixture(root, { badId: true });
  assert.throws(() => scanReleaseImages(env, { root, run: runner.run }), /scan evidence/u);
  assert.throws(() => readFileSync(join(root, RELEASE_SCAN_RECEIPT)), /ENOENT/u);
});

test('a real scanner child failing on the frontend blocks publication without leaking diagnostics', t => {
  const root = temporaryScanRoot(t); const callsPath = join(root, 'engine-calls.json');
  const executablePath = join(root, 'scanner-engine.mjs'); writeFileSync(callsPath, '[]');
  writeFileSync(executablePath, `import { readFileSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';
const args = process.argv.slice(2); const callsPath = ${JSON.stringify(callsPath)};
const calls = JSON.parse(readFileSync(callsPath, 'utf8')); calls.push(args); writeFileSync(callsPath, JSON.stringify(calls));
const ids = ${JSON.stringify(ids)};
if (args[0] === 'run') {
  const input = args[args.indexOf('--input') + 1];
  if (input.includes('frontend')) { console.error('fixture-private-scanner-diagnostic'); process.exit(17); }
  const output = join(${JSON.stringify(root)}, 'release-scan/output', basename(args[args.indexOf('--output') + 1]));
  writeFileSync(output, JSON.stringify(args[args.indexOf('--format') + 1] === 'json' ? ${JSON.stringify(scanReport(imageArchives[0].configId))} : ${JSON.stringify(scanSbom(imageArchives[0].configId))}));
} else if (args[1] === 'save') writeFileSync(args[3], Buffer.from(${JSON.stringify(imageArchives.map(archive => archive.bytes.toString('base64')))}[args.at(-1) === ids[0] ? 0 : 1], 'base64'));
else if (args[1] === 'inspect') {
  if (args[2] === ${JSON.stringify(RELEASE_SCANNER_IMAGE)}) console.log('sha256:' + '9'.repeat(64));
  else if (args[4] === '{{.Id}}') console.log(ids[args[2].includes('frontend') ? 1 : 0]);
  else console.log(${JSON.stringify(revision)});
}
`);
  const run = args => runDocker(args, { executable: process.execPath, prefix: [executablePath] });
  assert.throws(() => scanReleaseImages(env, { root, run }), { message: 'Release image command failed.' });
  assert.throws(() => publishReleaseImages(env, { run, exists: () => false, read: file => readFileSync(join(root, file)),
    write: () => assert.fail('manifest must not be written') }), /scan evidence/u);
  assert.equal(JSON.parse(readFileSync(callsPath, 'utf8')).some(args => args[1] === 'push'), false);
});

for (const failPush of [1, 2]) test(`push ${failPush} command failure creates no complete manifest`, () => {
  const runner = fixture({ failPush });
  assert.throws(() => publishReleaseImages(env, runner), /simulated command failure/u);
  assert.equal(runner.writes.length, 0);
  assert.equal(runner.calls.filter((args) => args[1] === 'push').length, failPush);
});

for (const change of [{ badId: true }, { badRevision: true }]) test(`image verification failure prevents every push: ${JSON.stringify(change)}`, () => {
  const runner = fixture(change);
  assert.throws(() => publishReleaseImages(env, runner), /mismatch/u);
  assert.equal(runner.calls.some((args) => args[1] === 'push'), false);
  assert.equal(runner.writes.length, 0);
});

test('dry-run verifies without writing and cannot enter publication', () => {
  const runner = fixture();
  verifyReleaseImages({ ...env, GITHUB_EVENT_NAME: 'workflow_dispatch' }, runner.run);
  assert.equal(runner.calls.some((args) => args[1] === 'push'), false);
  assert.throws(() => publishReleaseImages({ ...env, GITHUB_EVENT_NAME: 'workflow_dispatch' }, runner), /tag push/u);
  assert.equal(runner.writes.length, 0);
});

test('missing registry digest and stale manifest fail closed', () => {
  const runner = fixture({ missingDigest: true });
  assert.throws(() => publishReleaseImages(env, runner), /digest is unavailable/u);
  assert.equal(runner.writes.length, 0);
  const stale = fixture();
  assert.throws(() => publishReleaseImages(env, { ...stale, exists: () => true }), /already exists/u);
  assert.equal(stale.calls.length, 0);
});

test('partial, tag-based and unexpected-field manifests are rejected', () => {
  const complete = { schemaVersion: 1, revision, apiImage: refs[0], frontendImage: refs[1] };
  for (const invalid of [{ ...complete, frontendImage: undefined }, { ...complete, frontendImage: `${refs[1]}\n` },
    { ...complete, apiImage: env.BACKEND_TAGS }, { ...complete, completed: true }, { ...complete, revision: 'main' }]) {
    assert.throws(() => validateReleaseManifest(invalid), /Invalid complete release manifest/u);
  }
});

test('approved institution registry references remain supported by the manifest consumer', () => {
  const manifest = { schemaVersion: 1, revision,
    apiImage: `registry.example.org/institution/api@sha256:${'3'.repeat(64)}`,
    frontendImage: `registry.example.org/institution/frontend@sha256:${'4'.repeat(64)}` };
  assert.deepEqual(validateReleaseManifest(manifest), manifest);
});

test('a real child process failing the second push cannot write a completion receipt or expose command output', (t) => {
  const base = resolve(tmpdir());
  const root = mkdtempSync(join(base, 'egov-release-runner-'));
  t.after(() => {
    assert.ok(relative(base, root).startsWith('egov-release-runner-') && !relative(base, root).includes(sep));
    rmSync(root, { recursive: true, force: true });
  });
  const callsPath = join(root, 'calls.json');
  const executablePath = join(root, 'fake-engine.mjs');
  writeFileSync(callsPath, '[]');
  writeFileSync(executablePath, `import { readFileSync, writeFileSync } from 'node:fs';
const callsPath = ${JSON.stringify(callsPath)};
const args = process.argv.slice(2);
const calls = JSON.parse(readFileSync(callsPath, 'utf8'));
calls.push(args); writeFileSync(callsPath, JSON.stringify(calls));
const index = args[2].includes('frontend') || args[2] === ${JSON.stringify(ids[1])} ? 1 : 0;
if (args[1] === 'push' && index === 1) { console.error('fixture-private-engine-diagnostic'); process.exit(7); }
if (args[1] !== 'push') {
  if (args[4] === '{{.Id}}') console.log(${JSON.stringify(ids)}[index]);
  else if (args[4] === '{{json .RepoDigests}}') console.log(JSON.stringify([${JSON.stringify(refs)}[index]]));
  else console.log(${JSON.stringify(revision)});
}
`);
  const writes = [];
  assert.throws(() => publishReleaseImages(env, { exists: () => false,
    run: (args) => runDocker(args, { executable: process.execPath, prefix: [executablePath] }),
    ...scanEvidenceFixture(),
    write: (...args) => writes.push(args) }), { message: 'Release image command failed.' });
  assert.equal(writes.length, 0);
  assert.equal(JSON.parse(readFileSync(callsPath, 'utf8')).filter((args) => args[1] === 'push').length, 2);
});
