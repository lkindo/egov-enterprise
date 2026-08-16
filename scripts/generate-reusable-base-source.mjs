#!/usr/bin/env node
/**
 * 검증된 DB bundle과 현재 릴리스 소스를 결합해 reusable-base 소스 트리를 만든다.
 * 장기 template 브랜치를 만들거나 현재 working tree를 수정하지 않는다.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(SCRIPT_PATH), '..');
const MANIFEST_PATH = join(ROOT, 'config', 'reusable-base-profiles.json');
const OUTPUT_ROOT = join(ROOT, 'build', 'reusable-base', 'source');
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

function fail(message) {
  throw new Error(message);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: null,
    maxBuffer: 128 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    fail(`${command} 실행 실패(exit ${result.status}): ${result.stderr?.toString('utf8').trim() ?? ''}`);
  }
  return result.stdout ?? Buffer.alloc(0);
}

function git(args) {
  return run('git', args).toString('utf8').trim();
}

function parseArgs(argv) {
  const args = { profile: undefined, dbBundle: undefined, output: undefined, allowDirty: false, allowNonReleaseRef: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--profile') args.profile = argv[++index];
    else if (arg === '--db-bundle') args.dbBundle = argv[++index];
    else if (arg === '--output') args.output = argv[++index];
    else if (arg === '--allow-dirty') args.allowDirty = true;
    else if (arg === '--allow-non-release-ref') args.allowNonReleaseRef = true;
    else fail(`알 수 없는 인자: ${arg}`);
  }
  if (!args.profile || !args.dbBundle) fail('--profile과 --db-bundle이 필요하다.');
  return args;
}

function normalize(path) {
  return path.split(sep).join('/');
}

function safeOutputPath(requested, profile, shortSha) {
  const output = resolve(requested ?? join(OUTPUT_ROOT, `${profile}-${shortSha}`));
  const rel = relative(resolve(OUTPUT_ROOT), output);
  if (rel === '' || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    fail(`산출물 경로는 ${OUTPUT_ROOT} 아래여야 한다: ${output}`);
  }
  if (existsSync(output)) fail(`기존 산출물을 덮어쓰지 않는다: ${output}`);
  return output;
}

function trackedAndUntrackedFiles() {
  return run('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'])
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .filter((path) => !normalize(path).split('/').includes('build'));
}

function copySourceTree(output) {
  for (const rel of trackedAndUntrackedFiles()) {
    const source = join(ROOT, rel);
    if (!existsSync(source) || !statSync(source).isFile()) continue;
    const target = join(output, rel);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);
  }
  const gradlew = join(output, 'gradlew');
  if (existsSync(gradlew)) {
    // Windows 디렉터리 산출물에서는 실행 비트를 표현하지 못한다. 릴리스 archive 단계가
    // git index(100755)의 gradlew 모드를 보존해야 한다.
    statSync(gradlew);
  }
}

function walk(root, predicate, out = []) {
  if (!existsSync(root)) return out;
  for (const name of readdirSync(root)) {
    const path = join(root, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, predicate, out);
    else if (predicate(path)) out.push(path);
  }
  return out;
}

function removePath(path, removed) {
  if (!existsSync(path)) return;
  const stat = statSync(path);
  if (stat.isDirectory()) {
    for (const file of walk(path, () => true)) removed.add(file);
    rmSync(path, { recursive: true });
  } else {
    removed.add(path);
    rmSync(path);
  }
}

function javaType(path) {
  const source = readFileSync(path, 'utf8');
  const packageName = source.match(/\bpackage\s+([\w.]+)\s*;/)?.[1];
  return packageName ? `${packageName}.${basename(path, '.java')}` : undefined;
}

function importedJavaTypes(path) {
  const source = readFileSync(path, 'utf8');
  return [...source.matchAll(/\bimport\s+(?:static\s+)?([\w.]+)(?:\.\*)?\s*;/g)].map((match) => match[1]);
}

function referencedRemovedJavaType(path, removedTypes) {
  const source = readFileSync(path, 'utf8');
  const imported = importedJavaTypes(path).find((type) => removedTypes.has(type));
  if (imported) return imported;
  const packageName = source.match(/\bpackage\s+([\w.]+)\s*;/)?.[1];
  for (const type of removedTypes) {
    if (!type) continue;
    if (source.includes(type)) return type;
    if (!packageName || !type.startsWith(`${packageName}.`)) continue;
    const simpleName = type.slice(packageName.length + 1);
    if (new RegExp(`\\b${simpleName}\\b`).test(source)) return type;
  }
  return undefined;
}

function pruneJava(output, manifest, profile) {
  const allowedPacks = new Set(profile.packs);
  const excludedDomains = Object.entries(manifest.packs)
    .filter(([packName]) => !allowedPacks.has(packName))
    .flatMap(([, pack]) => pack.backend?.appDomains ?? []);
  const allBefore = walk(output, (path) => path.endsWith('.java'));
  const pathToType = new Map(allBefore.map((path) => [path, javaType(path)]));
  const removed = new Set();

  for (const domain of excludedDomains) {
    for (const sourceSet of ['main', 'test']) {
      for (const layer of ['domain', 'service']) {
        removePath(
          join(output, 'business-app', 'src', sourceSet, 'java', 'nuri', 'business', layer, domain),
          removed,
        );
      }
    }
  }

  const removedTypes = new Set([...removed].map((path) => pathToType.get(path)).filter(Boolean));
  let changed = true;
  while (changed) {
    changed = false;
    for (const path of allBefore) {
      if (removed.has(path) || !existsSync(path)) continue;
      const dangling = referencedRemovedJavaType(path, removedTypes);
      if (!dangling) continue;
      const rel = normalize(relative(output, path));
      if (rel.startsWith('foundation/') || rel.startsWith('business-core/')) {
        fail(`필수 모듈이 제외 domain을 참조한다: ${rel} -> ${dangling}`);
      }
      if (!rel.startsWith('business-app/') && !rel.startsWith('api-server/')) {
        fail(`자동 소유권을 판정할 수 없는 Java 참조: ${rel} -> ${dangling}`);
      }
      removed.add(path);
      removedTypes.add(pathToType.get(path));
      changed = true;
    }
  }

  for (const path of removed) if (existsSync(path)) rmSync(path);
  for (const path of walk(output, (candidate) => candidate.endsWith('.java'))) {
    const dangling = referencedRemovedJavaType(path, removedTypes);
    if (dangling) fail(`Java projection dangling import: ${normalize(relative(output, path))} -> ${dangling}`);
  }
  return { excludedDomains: excludedDomains.sort(), removedFiles: removed.size };
}

function resolveFrontendImport(frontendRoot, importer, specifier, knownFiles) {
  let base;
  if (specifier.startsWith('@/')) base = join(frontendRoot, 'src', specifier.slice(2));
  else if (specifier.startsWith('./') || specifier.startsWith('../')) base = resolve(dirname(importer), specifier);
  else return undefined;
  const candidates = [
    base,
    ...SOURCE_EXTENSIONS.map((extension) => `${base}${extension}`),
    ...SOURCE_EXTENSIONS.map((extension) => join(base, `index${extension}`)),
  ];
  return candidates.find((path) => knownFiles.has(path) || (existsSync(path) && statSync(path).isFile()));
}

function importedFrontendFiles(frontendRoot, path, knownFiles) {
  const source = readFileSync(path, 'utf8');
  const specifiers = [
    ...source.matchAll(/\b(?:import|export)\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g),
    ...source.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g),
  ].map((match) => match[1]);
  return specifiers.map((specifier) => resolveFrontendImport(frontendRoot, path, specifier, knownFiles)).filter(Boolean);
}

function stripExcludedFrontendPackBlocks(output, manifest, profile) {
  const frontendRoot = join(output, 'frontend');
  const knownPacks = new Set(Object.keys(manifest.packs));
  const allowedPacks = new Set(profile.packs);
  const excludedPacks = new Set([...knownPacks].filter((packName) => !allowedPacks.has(packName)));
  let changedFiles = 0;
  let strippedBlocks = 0;

  for (const path of walk(frontendRoot, (candidate) => SOURCE_EXTENSIONS.includes(extname(candidate)))) {
    const source = readFileSync(path, 'utf8');
    const lines = source.match(/[^\n]*\n|[^\n]+$/g) ?? [];
    const projected = [];
    let openMarker;

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const markers = [...line.matchAll(/reusable-base:([a-z0-9_-]+):(start|end)/g)];
      if (markers.length > 1) {
        fail(`frontend pack marker는 한 줄에 하나만 허용한다: ${normalize(relative(frontendRoot, path))}:${index + 1}`);
      }
      const marker = markers[0];
      if (!marker) {
        if (!openMarker?.strip) projected.push(line);
        continue;
      }

      const [, packName, boundary] = marker;
      if (!knownPacks.has(packName)) {
        fail(`알 수 없는 frontend pack marker: ${packName} (${normalize(relative(frontendRoot, path))}:${index + 1})`);
      }
      if (boundary === 'start') {
        if (openMarker) {
          fail(`frontend pack marker 중첩은 허용하지 않는다: ${normalize(relative(frontendRoot, path))}:${index + 1}`);
        }
        openMarker = { packName, line: index + 1, strip: excludedPacks.has(packName) };
        if (!openMarker.strip) projected.push(line);
        continue;
      }

      if (!openMarker || openMarker.packName !== packName) {
        fail(`짝이 맞지 않는 frontend pack marker: ${packName} (${normalize(relative(frontendRoot, path))}:${index + 1})`);
      }
      if (!openMarker.strip) projected.push(line);
      else strippedBlocks += 1;
      openMarker = undefined;
    }

    if (openMarker) {
      fail(`닫히지 않은 frontend pack marker: ${openMarker.packName} (${normalize(relative(frontendRoot, path))}:${openMarker.line})`);
    }
    const nextSource = projected.join('');
    if (nextSource !== source) {
      writeFileSync(path, nextSource, 'utf8');
      changedFiles += 1;
    }
  }

  return { excludedPacks: [...excludedPacks].sort(), strippedBlocks, changedFiles };
}

function pruneFrontend(output, manifest, profile) {
  const frontendRoot = join(output, 'frontend');
  const allowedPacks = new Set(profile.packs);
  const directPaths = Object.entries(manifest.packs)
    .filter(([packName]) => !allowedPacks.has(packName))
    .flatMap(([, pack]) => pack.frontend?.removePaths ?? []);
  const sourceFiles = walk(frontendRoot, (path) => SOURCE_EXTENSIONS.includes(extname(path)));
  const knownFiles = new Set(sourceFiles);
  const removed = new Set();
  for (const rel of directPaths) removePath(join(frontendRoot, rel), removed);

  let changed = true;
  while (changed) {
    changed = false;
    for (const path of sourceFiles) {
      if (removed.has(path) || !existsSync(path)) continue;
      if (!importedFrontendFiles(frontendRoot, path, knownFiles).some((dependency) => removed.has(dependency))) continue;
      removed.add(path);
      changed = true;
    }
  }
  for (const path of removed) if (existsSync(path)) rmSync(path);

  for (const critical of ['src/app/layout.tsx', 'src/app/page.tsx', 'src/app/login/page.tsx']) {
    if (!existsSync(join(frontendRoot, critical))) fail(`frontend 필수 진입점이 projection에서 제거됐다: ${critical}`);
  }
  for (const path of walk(frontendRoot, (candidate) => SOURCE_EXTENSIONS.includes(extname(candidate)))) {
    const dangling = importedFrontendFiles(frontendRoot, path, knownFiles).filter((dependency) => removed.has(dependency));
    if (dangling.length) fail(`frontend projection dangling import: ${normalize(relative(frontendRoot, path))}`);
  }
  return { directPaths: directPaths.sort(), removedFiles: removed.size };
}

function installDatabaseBundle(output, dbBundle) {
  const migrationTarget = join(output, 'api-server', 'src', 'main', 'resources', 'db', 'migration');
  if (existsSync(migrationTarget)) rmSync(migrationTarget, { recursive: true });
  mkdirSync(migrationTarget, { recursive: true });
  const migrationSource = join(dbBundle, 'db', 'migration');
  for (const file of readdirSync(migrationSource)) {
    copyFileSync(join(migrationSource, file), join(migrationTarget, file));
  }
}

function pruneHistoricalMigrationTests(output) {
  const schemaTestRoot = join(output, 'api-server', 'src', 'test', 'java', 'nuri', 'api', 'schema');
  const tests = walk(schemaTestRoot, (path) => /MigrationIntegrationTest\.java$/.test(path));
  for (const path of tests) rmSync(path);
  return tests.length;
}

function adaptOwnershipGuardBaseline(output) {
  const mainTypes = new Set(
    walk(output, (path) => path.endsWith('.java') && normalize(path).includes('/src/main/java/'))
      .map((path) => basename(path, '.java')),
  );
  const path = join(
    output,
    'api-server',
    'src',
    'test',
    'java',
    'nuri',
    'api',
    'harness',
    'OwnershipGuardBaselineLinterTest.java',
  );
  if (!existsSync(path)) return;
  const source = readFileSync(path, 'utf8');
  const block = /private static final Set<String> FROZEN_CENSUS = new TreeSet<>\(Arrays\.asList\(([\s\S]*?)\)\);/;
  const match = source.match(block);
  if (!match) fail('generated ownership guard baseline 블록을 찾지 못했다.');
  const entries = [...match[1].matchAll(/"([A-Za-z0-9_$]+#[^"]+)"/g)]
    .map((item) => item[1])
    .filter((entry) => mainTypes.has(entry.split('#')[0]));
  if (entries.length === 0) fail('generated ownership guard baseline이 비었다.');
  const replacement = 'private static final Set<String> FROZEN_CENSUS = new TreeSet<>(Arrays.asList(\n'
    + entries.map((entry, index) => `            "${entry}"${index === entries.length - 1 ? '' : ','}`).join('\n')
    + '));';
  writeFileSync(path, source.replace(block, replacement), 'utf8');
}

function adaptGeneratedHarness(output) {
  const replacements = [
    {
      path: join(output, 'api-server', 'src', 'test', 'java', 'nuri', 'api', 'schema', 'SchemaValidationIntegrationTest.java'),
      from: '.isGreaterThanOrEqualTo(20);',
      to: '.isGreaterThanOrEqualTo(2);',
    },
    {
      path: join(output, 'api-server', 'src', 'test', 'java', 'nuri', 'api', 'harness', 'EntitySchemaConformanceLinterTest.java'),
      from: 'if (files.size() < 20)',
      to: 'if (files.size() < 2)',
    },
    {
      path: join(output, 'api-server', 'src', 'test', 'java', 'nuri', 'api', 'harness', 'SeedLocationLinterTest.java'),
      from: 'private static final int MIGRATION_SQL_FLOOR = 25;',
      to: 'private static final int MIGRATION_SQL_FLOOR = 3;',
    },
  ];
  for (const replacement of replacements) {
    const source = readFileSync(replacement.path, 'utf8');
    if (!source.includes(replacement.from)) fail(`generated harness 조정 지점을 찾지 못했다: ${replacement.from}`);
    writeFileSync(replacement.path, source.replace(replacement.from, replacement.to), 'utf8');
  }
  adaptOwnershipGuardBaseline(output);
}

function skipJavaLiteral(source, open, quote) {
  for (let index = open + 1; index < source.length; index += 1) {
    if (source[index] === '\\') index += 1;
    else if (source[index] === quote) return index;
  }
  return source.length - 1;
}

function stripJavaComments(source) {
  let output = '';
  for (let index = 0; index < source.length;) {
    const char = source[index];
    if (char === '"' || char === "'") {
      const close = skipJavaLiteral(source, index, char);
      output += source.slice(index, close + 1);
      index = close + 1;
    } else if (char === '/' && source[index + 1] === '/') {
      const newline = source.indexOf('\n', index + 2);
      index = newline < 0 ? source.length : newline;
    } else if (char === '/' && source[index + 1] === '*') {
      const close = source.indexOf('*/', index + 2);
      index = close < 0 ? source.length : close + 2;
    } else {
      output += char;
      index += 1;
    }
  }
  return output;
}

function findJavaStatementEnd(source, from) {
  let depth = 0;
  for (let index = from; index < source.length; index += 1) {
    const char = source[index];
    if (char === '"' || char === "'") index = skipJavaLiteral(source, index, char);
    else if ('({['.includes(char)) depth += 1;
    else if (')}]'.includes(char)) depth -= 1;
    else if (char === ';' && depth <= 0) return index;
  }
  return -1;
}

function shortHash(value) {
  return createHash('sha256').update(value).digest('hex').slice(0, 12);
}

function extractHarnessConstants(source) {
  const code = stripJavaComments(source);
  const declaration = /static\s+final\s+(?:[A-Za-z_$][\w$]*\s*\.\s*)*(?:String|Set|List|Collection|Map|Pattern)\s*(?:<[^=;]*>)?\s*(?:\[\s*\])?\s+([A-Za-z_$][\w$]*)\s*=/g;
  const result = new Map();
  for (const match of code.matchAll(declaration)) {
    const end = findJavaStatementEnd(code, match.index + match[0].length);
    if (end < 0) continue;
    const rhs = code.slice(match.index + match[0].length, end);
    const normalized = rhs.replaceAll(/\s+/g, ' ').trim();
    const literalCount = [...rhs.matchAll(/"(?:\\.|[^"\\])*"/g)].length;
    result.set(match[1], `${literalCount}:${shortHash(normalized)}`);
  }
  return result;
}

function writeHarnessBaseline(output) {
  const roots = [
    ['api-server', 'api-server/src/test/java'],
    ['business-app', 'business-app/src/test/java'],
    ['business-core', 'business-core/src/test/java'],
    ['foundation', 'foundation/src/test/java'],
  ];
  const gatePattern = /(?:LinterTest|ArchTest|MatrixTest|GuardrailIntegrationTest|ValidationIntegrationTest|Archunit\w*)\.java$/;
  const entries = new Map();
  const classes = [];
  for (const [module, rel] of roots) {
    for (const path of walk(join(output, rel), (candidate) => candidate.endsWith('.java'))) {
      const normalized = normalize(path);
      if (!normalized.includes('/harness/') && !gatePattern.test(normalized)) continue;
      const className = `${module}/${basename(path, '.java')}`;
      classes.push(className);
      for (const [name, value] of extractHarnessConstants(readFileSync(path, 'utf8'))) {
        entries.set(`${className}.${name}`, value);
      }
    }
  }
  entries.set('__harness.classes', classes.sort().join(','));
  for (const hook of ['pre-push', 'pre-commit']) {
    const hookPath = join(output, '.githooks', hook);
    const value = existsSync(hookPath)
      ? shortHash(readFileSync(hookPath, 'utf8').replaceAll('\r\n', '\n'))
      : 'MISSING';
    entries.set(`__hooks.${hook}`, value);
  }
  const lines = [
    '# 자동 산출 — reusable-base source projection 기준.',
    '# 남은 게이트/동결 목록을 생성 시점에 고정한다.',
    ...[...entries.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => `${key}=${value}`),
    '',
  ];
  writeFileSync(
    join(output, 'api-server', 'src', 'test', 'resources', 'harness', 'baseline-manifest.properties'),
    lines.join('\n'),
    'utf8',
  );
}

function writeProjectedManifest(output, manifest, profileName, profile, dbLock) {
  const allowedPacks = new Set(profile.packs);
  const packs = Object.fromEntries(
    Object.entries(manifest.packs).filter(([packName]) => allowedPacks.has(packName)),
  );
  const ownedDomains = new Set(Object.values(packs).flatMap((pack) => pack.backend?.appDomains ?? []));
  const projected = {
    ...manifest,
    sourcePolicy: {
      ...manifest.sourcePolicy,
      generatedProfile: profileName,
    },
    profiles: {
      [profileName]: profile,
    },
    packs,
    clusters: (manifest.clusters ?? []).filter(
      (cluster) => allowedPacks.has(cluster.pack) &&
        [...(cluster.domains ?? []), ...(cluster.requiresDomains ?? [])].every((domain) => ownedDomains.has(domain)),
    ),
    sharedTableContracts: (manifest.sharedTableContracts ?? [])
      .filter((contract) => allowedPacks.has(contract.ownerPack))
      .map((contract) => ({
        ...contract,
        consumers: (contract.consumers ?? []).filter((consumer) => ownedDomains.has(consumer)),
      })),
    databaseSnapshot: {
      ...manifest.databaseSnapshot,
      source: `generated/${profileName}`,
      checkedAt: dbLock.generatedAt,
      physicalTableCountExcludingFlyway: dbLock.tables.length,
      physicalSequenceCount: dbLock.sequences.length,
      physicalStandaloneSequenceCount: Object.values(packs)
        .flatMap((pack) => pack.database.sequences ?? []).length,
    },
  };
  writeFileSync(
    join(output, 'config', 'reusable-base-profiles.json'),
    `${JSON.stringify(projected, null, 2)}\n`,
    'utf8',
  );
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  const profile = manifest.profiles?.[args.profile];
  if (!profile) fail(`지원하지 않는 profile: ${args.profile}`);

  const dirty = git(['status', '--porcelain']);
  if (dirty && !args.allowDirty) fail('공식 source artifact는 clean working tree에서만 생성한다.');
  const releaseTag = git(['tag', '--points-at', 'HEAD']).split(/\r?\n/).find((tag) => /^v\d/.test(tag));
  if (!releaseTag && !args.allowNonReleaseRef) fail('공식 source artifact는 v* 릴리스 태그에서만 생성한다.');
  const sourceCommit = git(['rev-parse', 'HEAD']);
  const dbBundle = resolve(args.dbBundle);
  const dbLockPath = join(dbBundle, 'profile-lock.json');
  if (!existsSync(dbLockPath)) fail(`DB bundle lock이 없다: ${dbLockPath}`);
  const dbLock = JSON.parse(readFileSync(dbLockPath, 'utf8'));
  if (dbLock.profile !== args.profile) fail(`DB bundle profile ${dbLock.profile} != source profile ${args.profile}`);
  if (dbLock.sourceCommit !== sourceCommit) fail(`DB bundle commit ${dbLock.sourceCommit} != source commit ${sourceCommit}`);

  const output = safeOutputPath(args.output, args.profile, sourceCommit.slice(0, 12));
  mkdirSync(output, { recursive: true });
  console.log(`[base-source] ${args.profile}: tracked source tree를 투영한다.`);
  copySourceTree(output);
  const java = pruneJava(output, manifest, profile);
  const packBlocks = stripExcludedFrontendPackBlocks(output, manifest, profile);
  const frontend = { ...pruneFrontend(output, manifest, profile), packBlocks };
  installDatabaseBundle(output, dbBundle);
  writeProjectedManifest(output, manifest, args.profile, profile, dbLock);
  const removedHistoricalMigrationTests = pruneHistoricalMigrationTests(output);
  adaptGeneratedHarness(output);
  writeHarnessBaseline(output);

  const lock = {
    schemaVersion: 1,
    profile: args.profile,
    packs: profile.packs,
    sourceCommit,
    sourceReleaseTag: releaseTag ?? null,
    localDevelopmentBuild: !releaseTag || Boolean(dirty),
    generatedAt: new Date().toISOString(),
    java,
    frontend,
    removedHistoricalMigrationTests,
    databaseLock: dbLock,
  };
  writeFileSync(join(output, 'reusable-base-lock.json'), `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
  writeFileSync(
    join(output, 'REUSABLE_BASE.md'),
    `# Reusable Base — ${args.profile}\n\n` +
      `릴리스 \`${releaseTag ?? sourceCommit.slice(0, 12)}\`에서 생성된 일회성 산출물이다. ` +
      `\`template/reusable-base\` 장기 브랜치가 아니다.\n\n` +
      `- packs: ${profile.packs.join(', ')}\n` +
      `- 제외 backend domains: ${java.excludedDomains.join(', ') || '(없음)'}\n` +
      `- 제거 Java files: ${java.removedFiles}\n` +
      `- 제거 frontend files: ${frontend.removedFiles}\n\n` +
      `DB migration은 신규 빈 PostgreSQL 전용이다. 운영/공유 DB 축소에 사용하지 않는다.\n`,
    'utf8',
  );
  console.log(`[base-source] PASS: ${normalize(relative(ROOT, output))}`);
  console.log(`[base-source] removed java=${java.removedFiles}, frontend=${frontend.removedFiles}`);
}

try {
  main();
} catch (error) {
  console.error(`[base-source] FAIL: ${error.message}`);
  process.exitCode = 1;
}
