import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, existsSync, fstatSync, lstatSync, mkdirSync, openSync, readFileSync, readSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const SHA = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;
const IMAGE_ID = /^sha256:[0-9a-f]{64}$/u;
const MANIFEST_KEYS = ['apiImage', 'frontendImage', 'revision', 'schemaVersion'];
export const RELEASE_SCANNER_IMAGE = 'ghcr.io/aquasecurity/trivy:0.74.0@sha256:62b1e65e8869bc4b4c6aa4fa2b21595256c7c2f6018a9d9ad61caf87187c1969';
export const RELEASE_SCAN_RECEIPT = 'release-scan-evidence.json';
const SCANNER_VERSION = '0.74.0';
const scanFailure = () => new Error('Release scan evidence is missing, invalid, or contains blocking vulnerabilities.');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const validTime = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const scanPath = (role, format) => `release-scan/output/${role}.${format === 'json' ? 'vuln' : 'cdx'}.json`;

function parseScanJson(bytes) {
  try { return JSON.parse(bytes); } catch { throw scanFailure(); }
}

// Docker's containerd store identifies an OCI index/manifest; Trivy identifies its config.
// Read tar bytes without extracting files. Unsupported tar forms fail closed.
export function validateImageArchive(source, imageId) {
  try {
    const reader = Buffer.isBuffer(source) ? { size: source.length, read: (offset, length) => source.subarray(offset, offset + length) } : source;
    const check = condition => { if (!condition) throw scanFailure(); };
    check(IMAGE_ID.test(imageId) && Number.isSafeInteger(reader?.size) && reader.size >= 1024
      && reader.size <= 4 * 1024 ** 3 && reader.size % 512 === 0 && typeof reader.read === 'function');
    const read = (offset, length) => {
      check(offset >= 0 && length >= 0 && offset + length <= reader.size);
      const bytes = reader.read(offset, length); check(Buffer.isBuffer(bytes) && bytes.length === length); return bytes;
    };
    const string = bytes => bytes.toString('utf8').replace(/\0.*$/su, '');
    const octal = bytes => { const value = string(bytes).trim(); check(/^[0-7]+$/u.test(value)); return Number.parseInt(value, 8); };
    const entries = new Map(); const names = new Set(); const archiveHash = createHash('sha256');
    let offset = 0; let ended = false;
    while (offset < reader.size) {
      const header = read(offset, 512); archiveHash.update(header); offset += 512;
      if (header.every(byte => byte === 0)) {
        check(reader.size - offset >= 512);
        while (offset < reader.size) { const block = read(offset, Math.min(1024 * 1024, reader.size - offset));
          check(block.every(byte => byte === 0)); archiveHash.update(block); offset += block.length; }
        ended = true; break;
      }
      check(names.size < 10_000 && string(header.subarray(257, 263)).trim() === 'ustar');
      const checksum = octal(header.subarray(148, 156)); const checkedHeader = Buffer.from(header); checkedHeader.fill(32, 148, 156);
      check([...checkedHeader].reduce((sum, byte) => sum + byte, 0) === checksum);
      const prefix = string(header.subarray(345, 500));
      const name = `${prefix ? `${prefix}/` : ''}${string(header.subarray(0, 100))}`;
      const type = header[156]; const size = octal(header.subarray(124, 136));
      const directory = type === 53;
      check(type === 0 || type === 48 || directory);
      check(directory ? /^(?:blobs\/?|blobs\/sha256\/?|[a-f0-9]{64}\/)$/u.test(name)
        : /^(?:manifest\.json|index\.json|oci-layout|repositories|blobs\/sha256\/[a-f0-9]{64}|[a-f0-9]{64}\.json|[a-f0-9]{64}\/(?:layer\.tar|json|VERSION))$/u.test(name));
      const key = name.replace(/\/$/u, ''); check(!names.has(key)); names.add(key);
      check(Number.isSafeInteger(size) && size >= 0 && (!directory || size === 0)
        && offset + Math.ceil(size / 512) * 512 <= reader.size);
      const bodyOffset = offset; const contentHash = createHash('sha256');
      let remaining = size;
      while (remaining) { const bytes = read(offset, Math.min(remaining, 1024 * 1024));
        contentHash.update(bytes); archiveHash.update(bytes); offset += bytes.length; remaining -= bytes.length; }
      const padding = (512 - size % 512) % 512;
      if (padding) { const bytes = read(offset, padding); check(bytes.every(byte => byte === 0)); archiveHash.update(bytes); offset += padding; }
      if (!directory) entries.set(name, { size, offset: bodyOffset, digest: `sha256:${contentHash.digest('hex')}` });
    }
    check(ended);
    const json = name => { const entry = entries.get(name); check(entry && entry.size > 0 && entry.size <= 2 * 1024 * 1024);
      return parseScanJson(read(entry.offset, entry.size)); };
    const legacy = json('manifest.json');
    check(Array.isArray(legacy) && legacy.length === 1 && typeof legacy[0].Config === 'string'
      && Array.isArray(legacy[0].Layers) && legacy[0].Layers.length > 0 && legacy[0].Layers.length <= 256);
    const configIdentity = (config, configId) => {
      check(config && typeof config.os === 'string' && /^[a-z0-9]+$/u.test(config.os) && config.os !== 'unknown'
        && typeof config.architecture === 'string' && /^[a-z0-9]+$/u.test(config.architecture) && config.architecture !== 'unknown'
        && config.rootfs?.type === 'layers' && Array.isArray(config.rootfs.diff_ids)
        && config.rootfs.diff_ids.length === legacy[0].Layers.length && config.rootfs.diff_ids.every(id => IMAGE_ID.test(id)));
      return { configId, diffIds: config.rootfs.diff_ids, platform: { os: config.os, architecture: config.architecture } };
    };
    let identity;
    if (entries.has('index.json')) {
      check(json('oci-layout').imageLayoutVersion === '1.0.0');
      const wrapper = json('index.json');
      check(wrapper.schemaVersion === 2 && wrapper.manifests?.length === 1 && wrapper.manifests[0].digest === imageId);
      const indexes = ['application/vnd.oci.image.index.v1+json', 'application/vnd.docker.distribution.manifest.list.v2+json'];
      const manifests = ['application/vnd.oci.image.manifest.v1+json', 'application/vnd.docker.distribution.manifest.v2+json'];
      const configs = ['application/vnd.oci.image.config.v1+json', 'application/vnd.docker.container.image.v1+json'];
      const layers = ['application/vnd.oci.image.layer.v1.tar', 'application/vnd.oci.image.layer.v1.tar+gzip',
        'application/vnd.oci.image.layer.v1.tar+zstd', 'application/vnd.docker.image.rootfs.diff.tar.gzip'];
      const blob = descriptor => {
        check(descriptor && IMAGE_ID.test(descriptor.digest) && Number.isSafeInteger(descriptor.size) && descriptor.size > 0);
        const name = `blobs/sha256/${descriptor.digest.slice(7)}`; const entry = entries.get(name);
        check(entry && entry.size === descriptor.size && entry.digest === descriptor.digest); return name;
      };
      const candidates = []; const attestations = []; const visited = new Set();
      const walk = (descriptor, depth = 0) => {
        check(depth < 5 && visited.size < 32 && !visited.has(descriptor.digest)); visited.add(descriptor.digest);
        const value = json(blob(descriptor)); check(value.schemaVersion === 2 && value.mediaType === descriptor.mediaType);
        if (indexes.includes(descriptor.mediaType)) {
          check(Array.isArray(value.manifests) && value.manifests.length > 0 && value.manifests.length <= 32);
          for (const child of value.manifests) walk(child, depth + 1);
          return;
        }
        check(manifests.includes(descriptor.mediaType) && configs.includes(value.config?.mediaType)
          && Array.isArray(value.layers) && value.layers.length > 0 && value.layers.length <= 256);
        const configPath = blob(value.config); const config = json(configPath);
        const layerPaths = value.layers.map(blob);
        if (descriptor.platform?.os === 'unknown' && descriptor.platform?.architecture === 'unknown') {
          check(config.os === 'unknown' && config.architecture === 'unknown'
            && descriptor.annotations?.['vnd.docker.reference.type'] === 'attestation-manifest'
            && IMAGE_ID.test(descriptor.annotations['vnd.docker.reference.digest']));
          attestations.push(descriptor.annotations['vnd.docker.reference.digest']); return;
        }
        check(value.layers.every(layer => layers.includes(layer.mediaType))
          && (!descriptor.platform || (descriptor.platform.os === config.os && descriptor.platform.architecture === config.architecture)));
        candidates.push({ ...configIdentity(config, value.config.digest), manifestDigest: descriptor.digest, configPath, layerPaths });
      };
      walk(wrapper.manifests[0]);
      check(candidates.length === 1 && attestations.every(reference => reference === candidates[0].manifestDigest));
      identity = candidates[0];
      check(legacy[0].Config === identity.configPath && JSON.stringify(legacy[0].Layers) === JSON.stringify(identity.layerPaths));
    } else {
      check(!entries.has('oci-layout') && legacy[0].Config === `${imageId.slice(7)}.json`
        && entries.get(legacy[0].Config)?.digest === imageId);
      identity = configIdentity(json(legacy[0].Config), imageId);
      check(legacy[0].Layers.every((name, index) => /^[a-f0-9]{64}\/layer\.tar$/u.test(name)
        && entries.get(name)?.digest === identity.diffIds[index]));
    }
    return { imageId, configId: identity.configId, platform: identity.platform, diffIds: identity.diffIds,
      manifestDigest: identity.manifestDigest ?? null, archiveSha256: archiveHash.digest('hex') };
  } catch { throw scanFailure(); }
}

export function readImageArchive(file, imageId) {
  let descriptor;
  try {
    if (lstatSync(file).isSymbolicLink()) throw scanFailure();
    descriptor = openSync(file, 'r'); const stat = fstatSync(descriptor);
    if (!stat.isFile()) throw scanFailure();
    return validateImageArchive({ size: stat.size, read: (offset, length) => {
      const buffer = Buffer.alloc(length); let read = 0;
      while (read < length) { const count = readSync(descriptor, buffer, read, length - read, offset + read);
        if (count === 0) throw scanFailure(); read += count; }
      return buffer;
    } }, imageId);
  } catch { throw scanFailure(); }
  finally { if (descriptor !== undefined) closeSync(descriptor); }
}

export function validateImageScan(report, sbom, identity) {
  const imageId = identity?.configId;
  if (report?.SchemaVersion !== 2 || report.Trivy?.Version !== SCANNER_VERSION
    || report.ArtifactType !== 'container_image' || report.Metadata?.ImageID !== imageId || !validTime(report.CreatedAt)
    || !IMAGE_ID.test(imageId ?? '') || !Array.isArray(identity?.diffIds)
    || JSON.stringify(report.Metadata.DiffIDs) !== JSON.stringify(identity.diffIds)
    || !Array.isArray(report.Results) || !report.Results.length) throw scanFailure();
  for (const result of report.Results) {
    if (!['os-pkgs', 'lang-pkgs'].includes(result.Class) || !Array.isArray(result.Packages)
      || (result.Vulnerabilities !== undefined && !Array.isArray(result.Vulnerabilities))
      || (result.ExperimentalModifiedFindings?.length ?? 0)) throw scanFailure();
    for (const vulnerability of result.Vulnerabilities ?? []) {
      if (!['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(vulnerability.Severity)
        || ['HIGH', 'CRITICAL'].includes(vulnerability.Severity)) throw scanFailure();
    }
  }
  // Both runtime images contain OS and application packages; an empty analyzer result is not a clean scan.
  if (!['os-pkgs', 'lang-pkgs'].every(kind => report.Results.some(result => result.Class === kind && result.Packages.length))) throw scanFailure();
  const properties = sbom?.metadata?.component?.properties;
  if (sbom?.bomFormat !== 'CycloneDX' || !/^1\.[5-9]$/u.test(sbom.specVersion ?? '')
    || sbom.metadata?.component?.type !== 'container' || !validTime(sbom.metadata?.timestamp)
    || !Array.isArray(properties) || properties.filter(property => property.name === 'aquasecurity:trivy:ImageID').length !== 1
    || !properties.some(property => property.name === 'aquasecurity:trivy:ImageID' && property.value === imageId)
    || !Array.isArray(sbom.metadata?.tools?.components)
    || !sbom.metadata.tools.components.some(tool => tool.group === 'aquasecurity' && tool.name === 'trivy' && tool.version === SCANNER_VERSION)
    || !Array.isArray(sbom.components) || !sbom.components.length
    || (sbom.vulnerabilities !== undefined && (!Array.isArray(sbom.vulnerabilities) || sbom.vulnerabilities.length))) throw scanFailure();
}

function scannerMetadata(value) {
  const databases = {};
  if (value?.Version !== SCANNER_VERSION || !value.VulnerabilityDB) throw scanFailure();
  for (const key of ['VulnerabilityDB', 'JavaDB']) {
    const db = value[key];
    if (db === undefined && key === 'JavaDB') continue;
    if (!Number.isSafeInteger(db.Version) || db.Version < 1
      || !['UpdatedAt', 'NextUpdate', 'DownloadedAt'].every(field => validTime(db[field]))) throw scanFailure();
    databases[key] = { Version: db.Version, UpdatedAt: db.UpdatedAt, NextUpdate: db.NextUpdate, DownloadedAt: db.DownloadedAt };
  }
  return { Version: SCANNER_VERSION, ...databases };
}

export function verifyReleaseScanEvidence(env, images, read = readFileSync, readArchive = readImageArchive) {
  try {
    const receipt = parseScanJson(read(RELEASE_SCAN_RECEIPT));
    if (receipt.schemaVersion !== 1 || receipt.revision !== env.GITHUB_SHA || receipt.scannerImage !== RELEASE_SCANNER_IMAGE
      || !IMAGE_ID.test(receipt.scannerImageId ?? '') || !validTime(receipt.createdAt)
      || receipt.runId !== (env.GITHUB_RUN_ID ?? null) || receipt.runAttempt !== (env.GITHUB_RUN_ATTEMPT ?? null)
      || !Array.isArray(receipt.images) || receipt.images.length !== 2) throw scanFailure();
    scannerMetadata(receipt.scanner);
    for (const [index, role] of ['api', 'frontend'].entries()) {
      const item = receipt.images[index];
      if (item.role !== role || item.imageId !== images[index].id || item.revision !== env.GITHUB_SHA
        || item.report !== scanPath(role, 'json') || item.sbom !== scanPath(role, 'cyclonedx')
        || item.archive !== `release-scan/input/${role}.tar`) throw scanFailure();
      const identity = readArchive(item.archive, item.imageId);
      if (item.configId !== identity.configId || item.archiveSha256 !== identity.archiveSha256) throw scanFailure();
      // Read each file once; validate the same bytes whose digest is accepted.
      const report = read(item.report); const sbom = read(item.sbom);
      if (digest(report) !== item.reportSha256 || digest(sbom) !== item.sbomSha256) throw scanFailure();
      validateImageScan(parseScanJson(report), parseScanJson(sbom), identity);
    }
    return receipt;
  } catch { throw scanFailure(); }
}

export function scanReleaseImages(env, { run = runDocker, root = process.cwd() } = {}) {
  const images = verifyReleaseImages(env, run);
  const directory = path.resolve(root, 'release-scan');
  const receiptPath = path.resolve(root, RELEASE_SCAN_RECEIPT);
  if (existsSync(directory) || existsSync(receiptPath) || directory.includes(',')) throw scanFailure();
  for (const folder of ['input', 'output', 'cache']) mkdirSync(path.join(directory, folder), { recursive: true, mode: 0o700 });
  run(['pull', RELEASE_SCANNER_IMAGE]);
  const scannerImageId = run(['image', 'inspect', RELEASE_SCANNER_IMAGE, '--format', '{{.Id}}']);
  if (!IMAGE_ID.test(scannerImageId)) throw scanFailure();
  const scanner = ['run', '--rm', '--pull', 'never', '--read-only', '--cap-drop', 'ALL',
    '--security-opt', 'no-new-privileges', '--tmpfs', '/tmp:rw,noexec,nosuid,size=4g', '--workdir', '/tmp',
    '--mount', `type=bind,source=${path.join(directory, 'input')},target=/input,readonly`,
    '--mount', `type=bind,source=${path.join(directory, 'output')},target=/output`,
    '--mount', `type=bind,source=${path.join(directory, 'cache')},target=/cache`, RELEASE_SCANNER_IMAGE];
  const scanned = [];
  for (const [index, role] of ['api', 'frontend'].entries()) {
    const image = images[index];
    const archive = `release-scan/input/${role}.tar`;
    const archivePath = path.resolve(root, archive);
    run(['image', 'save', '--output', archivePath, image.id]);
    const identity = readImageArchive(archivePath, image.id);
    for (const format of ['json', 'cyclonedx']) {
      run([...scanner, 'image', '--cache-dir', '/cache', '--config', '/dev/null', '--ignorefile', '/dev/null',
        '--scanners', 'vuln', '--pkg-types', 'os,library', '--list-all-pkgs',
        '--severity', 'HIGH,CRITICAL', '--exit-code', '1', '--timeout', '15m', '--format', format,
        '--input', `/input/${role}.tar`, '--output', `/output/${path.basename(scanPath(role, format))}`]);
    }
    const report = readFileSync(path.join(root, scanPath(role, 'json')));
    const sbom = readFileSync(path.join(root, scanPath(role, 'cyclonedx')));
    const afterScan = readImageArchive(archivePath, image.id);
    if (identity.archiveSha256 !== afterScan.archiveSha256) throw scanFailure();
    validateImageScan(parseScanJson(report), parseScanJson(sbom), identity);
    scanned.push({ role, imageId: image.id, revision: env.GITHUB_SHA, report: scanPath(role, 'json'), reportSha256: digest(report),
      sbom: scanPath(role, 'cyclonedx'), sbomSha256: digest(sbom), archive,
      archiveSha256: identity.archiveSha256, configId: identity.configId });
  }
  const metadata = scannerMetadata(parseScanJson(run([...scanner, 'version', '--cache-dir', '/cache', '--format', 'json'])));
  verifyReleaseImages(env, run);
  const receipt = { schemaVersion: 1, revision: env.GITHUB_SHA, createdAt: new Date().toISOString(),
    runId: env.GITHUB_RUN_ID ?? null, runAttempt: env.GITHUB_RUN_ATTEMPT ?? null,
    scannerImage: RELEASE_SCANNER_IMAGE, scannerImageId, scanner: metadata, images: scanned };
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  return receipt;
}

export function validateReleaseManifest(manifest) {
  if (!manifest || Array.isArray(manifest)
      || Object.keys(manifest).sort().join() !== MANIFEST_KEYS.join()
      || manifest.schemaVersion !== 1 || !SHA.test(manifest.revision)) {
    throw new Error('Invalid complete release manifest.');
  }
  const digestReference = /^[a-z0-9][a-z0-9._:/-]*@sha256:[0-9a-f]{64}$/u;
  if (typeof manifest.apiImage !== 'string' || typeof manifest.frontendImage !== 'string'
      || !digestReference.test(manifest.apiImage) || !digestReference.test(manifest.frontendImage)) {
    throw new Error('Invalid complete release manifest.');
  }
  return manifest;
}

// Capture engine output: failures must not replay credentials, build arguments or daemon diagnostics.
export function runDocker(args, { executable = 'docker', prefix = [] } = {}) {
  const result = spawnSync(executable, [...prefix, ...args], { encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024, timeout: 20 * 60 * 1000 });
  if (result.error || result.status !== 0) throw new Error('Release image command failed.');
  return result.stdout.trim();
}

function releaseImages(env) {
  if (!SHA.test(env.GITHUB_SHA ?? '') || !/^[a-z0-9][a-z0-9-]*$/u.test(env.RELEASE_NAMESPACE ?? '')) {
    throw new Error('Invalid release image configuration.');
  }
  return [['BACKEND', 'egov-api'], ['FRONTEND', 'egov-frontend']].map(([key, name]) => {
    const repository = `ghcr.io/${env.RELEASE_NAMESPACE}/${name}`;
    const tags = (env[`${key}_TAGS`] ?? '').split(/\r?\n/u).filter(Boolean);
    const id = env[`${key}_IMAGE_ID`] ?? '';
    if (!IMAGE_ID.test(id) || tags.length === 0 || new Set(tags).size !== tags.length
        || tags.some((tag) => !tag.startsWith(`${repository}:`)
          || !/^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/u.test(tag.slice(repository.length + 1)))) {
      throw new Error('Invalid release image configuration.');
    }
    return { repository, tags, id };
  });
}

export function verifyReleaseImages(env, run = runDocker) {
  const images = releaseImages(env);
  for (const image of images) {
    for (const tag of image.tags) {
      if (run(['image', 'inspect', tag, '--format', '{{.Id}}']) !== image.id) {
        throw new Error('Release image identity mismatch.');
      }
    }
    if (run(['image', 'inspect', image.id, '--format', '{{index .Config.Labels "org.opencontainers.image.revision"}}']) !== env.GITHUB_SHA) {
      throw new Error('Release image revision mismatch.');
    }
  }
  return images;
}

export function publishReleaseImages(env, { run = runDocker, write = writeFileSync, exists = existsSync, read = readFileSync, readArchive = readImageArchive } = {}) {
  if (env.GITHUB_EVENT_NAME !== 'push' || !/^refs\/tags\/v[^\s]+$/u.test(env.GITHUB_REF ?? '')) {
    throw new Error('Image publication requires a release tag push.');
  }
  const output = 'release-manifest.json';
  // A stale receipt cannot be mistaken for this attempt's completion.
  if (exists(output)) throw new Error('Release manifest already exists.');
  const images = verifyReleaseImages(env, run);
  verifyReleaseScanEvidence(env, images, read, readArchive);
  const references = [];
  for (const image of images) {
    for (const tag of image.tags) run(['image', 'push', tag]);
    let digests;
    try { digests = JSON.parse(run(['image', 'inspect', image.id, '--format', '{{json .RepoDigests}}'])); }
    catch { throw new Error('Published image digest is unavailable.'); }
    const matches = Array.isArray(digests) ? digests.filter((ref) =>
      typeof ref === 'string' && ref.startsWith(`${image.repository}@sha256:`)
      && /^[0-9a-f]{64}$/u.test(ref.slice(`${image.repository}@sha256:`.length))) : [];
    if (matches.length !== 1) throw new Error('Published image digest is unavailable.');
    references.push(matches[0]);
  }
  const manifest = validateReleaseManifest({ schemaVersion: 1, revision: env.GITHUB_SHA,
    apiImage: references[0], frontendImage: references[1] });
  write(output, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv[2] === 'verify') verifyReleaseImages(process.env);
    else if (process.argv[2] === 'scan') scanReleaseImages(process.env);
    else if (process.argv[2] === 'publish') publishReleaseImages(process.env);
    else throw new Error('Expected release image verify, scan or publish command.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
