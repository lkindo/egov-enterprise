/** Additive API inputs and the existing contract generators, without changing inherited contracts. */
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { GENERATED_CONTRACT_TYPES, generatedContractFiles } from './verify-generated-contracts.mjs';
import { regenerateContractTypes } from './reusable-contract-projection.mjs';

export const API_DOCS_PATH = 'api-docs.json';
export const API_GENERATOR_PATH = '.agent/scripts/codegen-zod.js';
const entries = new Set(Object.values(GENERATED_CONTRACT_TYPES));
export const isAdopterContractArtifact = path => entries.has(path)
  || /^frontend\/src\/types\/generated-(?:zod|operations)\/[^/]+\.ts$/u.test(path);
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const check = (condition, message) => { if (!condition) throw new Error(message); };
const templateSegment = value => /^\{[^/{}]+\}$/u.test(value);
const overlappingPaths = (left, right) => {
  const a = left.split('/').filter(Boolean);
  const b = right.split('/').filter(Boolean);
  return a.length === b.length && a.every((segment, index) => segment === b[index]
    || templateSegment(segment) || templateSegment(b[index]));
};

export function validateAdditiveApiDocs(original, current, bindings) {
  const { paths: oldPaths, components: oldComponents = {}, tags: oldTags = [], ...oldOther } = original;
  const { paths, components = {}, tags = [], ...other } = current;
  check(equal(oldOther, other), 'Original API document settings must be retained');
  check(paths && oldPaths, 'API document paths are required');
  const before = new Set();
  for (const [path, item] of Object.entries(oldPaths)) {
    for (const [method, value] of Object.entries(item)) {
      check(equal(paths[path]?.[method], value), `Original API operation must be retained: ${method} ${path}`);
      before.add(`${method} ${path}`);
    }
  }
  for (const [path, item] of Object.entries(paths)) for (const method of Object.keys(item)) {
    if (before.has(`${method} ${path}`)) continue;
    check(method === 'get', 'Only new GET APIs are supported by additive registration');
    check(bindings.some(row => row.path === path && row.method === method.toUpperCase()),
      `New API operation requires a registered added handler binding: ${method} ${path}`);
    check(!Object.entries(oldPaths).some(([prior, operations]) => Object.hasOwn(operations, method) && overlappingPaths(prior, path)),
      `New API path overlaps an inherited operation: ${method} ${path}`);
  }
  check(equal(tags.slice(0, oldTags.length), oldTags) && new Set(tags.map(row => row.name)).size === tags.length,
    'Original API tags must be retained without duplicates');
  const { schemas: oldSchemas = {}, ...oldOtherComponents } = oldComponents;
  const { schemas = {}, ...otherComponents } = components;
  check(equal(oldOtherComponents, otherComponents), 'Original non-schema API components must be retained');
  for (const [name, schema] of Object.entries(oldSchemas)) check(equal(schemas[name], schema), `Original API schema must be retained: ${name}`);
  function localReferences(value) {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (key === '$ref') check(typeof child === 'string' && child.startsWith('#/components/schemas/')
        && Object.hasOwn(schemas, child.slice('#/components/schemas/'.length)), 'API contracts require defined local schema references');
      else localReferences(child);
    }
  }
  localReferences(current);
}

export function currentContractArtifacts(root) {
  return new Map(Object.keys(GENERATED_CONTRACT_TYPES).flatMap(key => generatedContractFiles(root, key))
    .map(path => [path, readFileSync(join(root, path), 'utf8').replace(/\r\n?/gu, '\n')]));
}

/** Regenerate in a disposable directory; never trusts hand-edited output or a git index. */
export function buildAdopterContractArtifacts(root) {
  const temporary = mkdtempSync(join(tmpdir(), 'egov-adopter-contract-'));
  try {
    mkdirSync(join(temporary, 'frontend/src/types'), { recursive: true });
    // The generator reads only the explicit spec. No remote refs are admitted by validateAdditiveApiDocs.
    copyFileSync(join(root, API_DOCS_PATH), join(temporary, API_DOCS_PATH));
    regenerateContractTypes({ sourceRoot: root, output: temporary });
    return currentContractArtifacts(temporary);
  } finally {
    check(dirname(resolve(temporary)) === resolve(tmpdir()) && temporary.startsWith(join(tmpdir(), 'egov-adopter-contract-')),
      'Unexpected adopter contract temporary directory');
    rmSync(temporary, { recursive: true, force: true });
  }
}
