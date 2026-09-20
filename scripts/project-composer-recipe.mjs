import { canonicalJson, compositionDigest } from './project-composer-catalog.mjs';
import { normalizeBackendLayout } from './reusable-layout.mjs';

export const COMPOSER_SELECTION_PATH = 'config/governance/upstream-review/project-composer-selection.json';

const sorted = values => [...new Set(values)].sort();

export class ProjectRecipeError extends Error {
  constructor(code, field, message) { super(message); this.name = 'ProjectRecipeError'; this.code = code; this.field = field; }
}
function fail(field, message, code = 'INVALID_RECIPE') { throw new ProjectRecipeError(code, field, message); }
function object(value, field, allowed) {
  if (value === null || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) fail(field, `${field} must be an object`);
  const unknown = Object.keys(value).filter(key => !allowed.includes(key));
  if (unknown.length) fail(field, `${field} contains unsupported fields: ${unknown.sort().join(', ')}`);
}

/** Pure planning: no filesystem, DB, shell or generated-directory mutation. */
export function resolveProjectRecipe(input, catalog) {
  object(input, 'recipe', ['schemaVersion', 'project', 'sourceRef', 'selection', 'database', 'backendLayout']);
  if (input.schemaVersion !== 1) fail('schemaVersion', 'Only recipe schemaVersion 1 is supported');
  object(input.project, 'project', ['name']);
  if (typeof input.project.name !== 'string' || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(input.project.name) || input.project.name.length > 63) {
    fail('project.name', 'Project name must be a lowercase identifier of at most 63 characters');
  }
  if (/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(input.project.name)) fail('project.name', 'Reserved filesystem project name');
  if (typeof input.sourceRef !== 'string' || input.sourceRef.length > 160
    || !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(input.sourceRef) || input.sourceRef.includes('..')
    || input.sourceRef.includes('//') || /[/.]$/.test(input.sourceRef) || input.sourceRef.endsWith('.lock')) {
    fail('sourceRef', 'A source reference without shell, traversal or revision-expression syntax is required');
  }
  object(input.selection, 'selection', ['preset', 'domains']);
  if (Object.hasOwn(input.selection, 'preset') === Object.hasOwn(input.selection, 'domains')) fail('selection', 'Choose exactly one of preset or domains');
  const database = input.database ?? { vendor: 'postgresql' };
  object(database, 'database', ['vendor']);
  if (database.vendor !== 'postgresql') fail('database.vendor', 'Only PostgreSQL is currently supported', 'UNSUPPORTED_DATABASE');
  let backendLayout;
  try { backendLayout = normalizeBackendLayout(input.backendLayout); } catch { fail('backendLayout', 'Unsupported backend layout', 'UNSUPPORTED_LAYOUT'); }
  if (!catalog || catalog.schemaVersion !== 1 || !Array.isArray(catalog.capabilities)) fail('catalog', 'A valid capability catalog is required');
  const { catalogHash, ...catalogBody } = catalog;
  // Engine decorations such as sourceRef/sourceCommit are deliberately excluded
  // from this inventory contract and should be carried in its API envelope.
  if (compositionDigest(catalogBody) !== catalogHash) fail('catalog', 'Capability catalog hash mismatch', 'CATALOG_MISMATCH');
  const features = new Map(catalog.capabilities.map(capability => [capability.id, capability]));
  let preset;
  let selectedDomains;
  if (Object.hasOwn(input.selection, 'preset')) {
    preset = catalog.presets.find(item => item.id === input.selection.preset);
    if (!preset) fail('selection.preset', 'Unknown project preset');
    selectedDomains = [...preset.domains];
  } else {
    if (!Array.isArray(input.selection.domains) || input.selection.domains.some(domain => typeof domain !== 'string')) fail('selection.domains', 'Domains must be an array of capability identifiers');
    if (new Set(input.selection.domains).size !== input.selection.domains.length) fail('selection.domains', 'Duplicate domain selections are not allowed');
    selectedDomains = sorted(input.selection.domains);
  }
  for (const domain of selectedDomains) {
    if (!features.has(domain)) fail('selection.domains', `Unknown domain: ${domain}`);
    if (!features.get(domain).available) fail('selection.domains', `Domain is not available: ${domain}`, 'UNAVAILABLE_DOMAIN');
  }
  const selected = new Set(selectedDomains);
  const reasons = new Map();
  const included = new Set(selectedDomains);
  const queue = [...selectedDomains];
  for (let index = 0; index < queue.length; index += 1) {
    const domain = queue[index];
    for (const edge of features.get(domain).requires) {
      if (preset && edge.customOnly) continue;
      if (!features.has(edge.domain) || !features.get(edge.domain).available) fail('catalog', `Dependency is unavailable: ${domain} -> ${edge.domain}`);
      if (!selected.has(edge.domain)) {
        if (!reasons.has(edge.domain)) reasons.set(edge.domain, new Set());
        reasons.get(edge.domain).add(`${domain}: ${edge.reason}`);
      }
      if (!included.has(edge.domain)) { included.add(edge.domain); queue.push(edge.domain); }
    }
  }
  const resolvedDomains = sorted(included);
  if (preset && canonicalJson(resolvedDomains) !== canonicalJson([...preset.domains].sort())) fail('catalog', `Preset dependency closure changed: ${preset.id}`);
  const retained = resolvedDomains.map(domain => features.get(domain));
  const tables = sorted([...catalog.core.tables, ...retained.flatMap(feature => feature.database.tables)]);
  const explicitSequences = sorted([...catalog.core.explicitSequences, ...retained.flatMap(feature => feature.database.explicitSequences)]);
  const includeRule = rule => rule.mode === 'any' ? rule.domains.some(domain => included.has(domain)) : rule.domains.every(domain => included.has(domain));
  const includedPaths = sorted(catalog.frontendRules.filter(includeRule).map(rule => rule.path));
  const removePaths = preset ? preset.frontendRemovePaths : sorted(catalog.frontendRules.filter(rule => !includeRule(rule)).map(rule => rule.path));
  // Existing presets own the old route surface. Suppress routes under their
  // declared removals even where a retained domain has a richer custom menu.
  const removedRoute = route => {
    const pathname = route.split('?')[0];
    const source = pathname === '/' ? 'src/app/page.tsx' : `src/app${pathname}/page.tsx`;
    return removePaths.some(path => source === path || source.startsWith(`${path}/`));
  };
  const menuRoutes = sorted([...catalog.core.menuRoutes, ...retained.flatMap(feature => feature.menuRoutes),
    ...catalog.sharedUi.filter(group => group.domains.every(domain => included.has(domain))).flatMap(group => group.routes)])
    .filter(route => !removedRoute(route));
  const permissionCodes = sorted([...catalog.core.permissionCodes, ...retained.flatMap(feature => feature.permissionCodes)]);
  const normalizedRecipe = { schemaVersion: 1, project: { name: input.project.name }, sourceRef: input.sourceRef,
    selection: preset ? { preset: preset.id } : { domains: selectedDomains }, database: { vendor: 'postgresql' }, backendLayout };
  const composition = {
    schemaVersion: 1, recipe: normalizedRecipe, project: normalizedRecipe.project, sourceRef: normalizedRecipe.sourceRef,
    profile: preset?.id ?? 'custom', mandatory: [...catalog.mandatory], selectedDomains, resolvedDomains,
    autoIncluded: [...reasons].map(([domain, why]) => ({ domain, reason: [...why].sort().join(' ') })).sort((a, b) => a.domain.localeCompare(b.domain)),
    packs: preset ? [...preset.packs] : sorted(['core', ...retained.map(feature => feature.pack)]),
    database: normalizedRecipe.database, backendLayout, tables, explicitSequences, permissionCodes, menuRoutes,
    frontend: { includedPaths, removePaths, retainedRoutes: menuRoutes.filter(route => !route.includes('?')) },
    optionalForeignKeys: catalog.optionalForeignKeys.filter(fk => tables.includes(fk.childTable) && !tables.includes(fk.parentTable)),
    requirements: sorted(retained.flatMap(feature => feature.requirements)),
    catalogHash, recipeHash: compositionDigest(normalizedRecipe),
  };
  return { ...composition, compositionHash: compositionDigest(composition) };
}

/** Recompute a supplied plan; callers must consume the returned trusted plan. */
export function verifyProjectComposition(candidate, catalog) {
  if (candidate === null || typeof candidate !== 'object' || Array.isArray(candidate)) fail('composition', 'A resolved composition is required');
  const expected = resolveProjectRecipe(candidate.recipe, catalog);
  // sourceCommit is verified by the orchestrator against sourceRef, not by this
  // pure resolver. No other caller-supplied field may alter the resolved plan.
  const { sourceCommit: ignoredCommit, ...actual } = candidate;
  if (canonicalJson(actual) !== canonicalJson(expected)) fail('composition', 'Resolved composition does not match its recipe and catalog', 'COMPOSITION_MISMATCH');
  return expected;
}
