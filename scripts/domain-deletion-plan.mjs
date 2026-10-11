#!/usr/bin/env node
/**
 * 수동 도메인 삭제(scripts/delete-domain.ps1)의 동반 삭제 판정.
 *
 * 생성기와 같은 requires 간선을 거꾸로 따라간다. 지우는 기능을 요구하는 기능은 함께 지운다 —
 * 남기면 컴파일되지 않거나, 주입받을 구현이 사라져 기동하지 않거나, 함께 생성하라는 묶음 선언을 어긴다.
 * 지우는 기능이 요구하는 기능은 남긴다. 그쪽은 지운 기능 없이도 선다.
 *
 * 화면을 같이 쓰는 데서 나온 간선(customOnly — 공동 화면·화면 참조)은 보지 않는다. 그 간선은 직접 선택 생성에서
 * 어떤 화면을 남길지 정하는 데만 쓰고, delete-domain 은 화면을 pack 단위로만 지운다.
 *
 * 간선은 카탈로그 전체(loadProjectComposerCatalog)를 적재하지 않고 지금 트리에서 계산한다(treeDeletionCatalog).
 * 카탈로그는 원본 저장소의 기능 19개가 모두 있고 화면 근거 파일·소유 표가 맞을 때만 적재된다. delete-domain 은
 * 생성물, 이미 한 번 지운 트리, 새 도메인을 스캐폴드한 트리에서도 돌아야 한다. 간선 규칙(Java 참조·지원 파일·묶음
 * 선언)은 카탈로그와 같은 함수를 쓰고, 원본 트리에서 두 결과가 같다는 것을 계약이 고정한다.
 *
 * 종전 delete-domain 은 manifest clusters 를 방향 없이 고정점으로 넓혔다. 코드 참조·지원 파일 간선을 보지 않아
 * 템플릿만 지우면 커뮤니티가 쓰는 템플릿 배정 구현이 함께 지워졌고, 묶음에서 근거 없는 간선을 걷으면
 * 게시판·결재를 지울 때 그 기능을 요구하는 스크랩·행사가 남았다.
 *
 * 사용: node scripts/domain-deletion-plan.mjs --json [--root <저장소>] <도메인> [<도메인>...]
 * 출력 JSON 의 비 ASCII 문자는 \uXXXX 로 적는다. 콘솔 코드 페이지와 관계없이 PowerShell 이 같은 값을 읽는다.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { appSourceDomain, clusterRequirements, javaDomainReferences } from './project-composer-catalog.mjs';
import { REQUIRES_USER_REASONS } from './project-composer-reasons.mjs';
import { supportFileDirectoryDomain } from './project-composer-source.mjs';

const MANIFEST = 'config/reusable-base-profiles.json';
const APP_ROOT = 'business-app/src/main/java/nuri/business';

/**
 * @param {{ catalog: { capabilities: { id: string, present?: boolean, requires: { domain: string, kind: string, customOnly?: boolean, userReason?: string | null }[] }[] }, requested: string[] }} input
 * @returns {{ requested: string[], domains: string[], added: { domain: string, because: { from: string, to: string, kinds: string[], userReason: string | null } }[] }}
 */
export function planDomainDeletion({ catalog, requested }) {
  const capabilities = [...catalog.capabilities].sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
  const known = new Set(capabilities.map(capability => capability.id));
  const names = [...new Set((requested ?? []).map(name => String(name).trim().toLowerCase()).filter(Boolean))].sort();
  if (!names.length) throw new Error('no domain to delete');
  const unknown = names.filter(name => !known.has(name));
  if (unknown.length) throw new Error(`unknown domain: ${unknown.join(', ')}`);

  const deleting = new Set(names);
  const added = [];
  const queue = [...names];
  while (queue.length) {
    const removed = queue.shift();
    for (const capability of capabilities) {
      // 소스가 이미 없는 기능은 동반 삭제로 더하지 않는다. 지울 것이 없고, 그 기능을 거쳐 다른 기능을 끌어오지도 않는다.
      if (deleting.has(capability.id) || capability.present === false) continue;
      const edges = capability.requires.filter(edge => edge.domain === removed && !edge.customOnly);
      if (!edges.length) continue;
      deleting.add(capability.id);
      queue.push(capability.id);
      added.push({ domain: capability.id, because: { from: capability.id, to: removed,
        kinds: [...new Set(edges.map(edge => edge.kind))].sort(), userReason: edges.find(edge => edge.userReason)?.userReason ?? null } });
    }
  }
  return { requested: names, domains: [...deleting].sort(), added };
}

function javaFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.java'))
    .map(entry => join(entry.parentPath ?? entry.path, entry.name)).sort();
}

/**
 * 지금 트리에서 삭제 판정에 쓰는 기능 목록을 만든다. 기능은 manifest appDomains 이고, 간선은 카탈로그의 비 customOnly 간선과
 * 같은 세 종류다 — 업무 앱 Java 참조(java), 다른 기능 디렉터리의 지원 파일(java), 생성 묶음 선언(manifest).
 * manifest 에 없는 기능 디렉터리(스캐폴드한 새 도메인)의 소스는 건너뛴다 — 그 소스의 잔존 참조는 delete-domain 의 잔존 참조 검사가 알린다.
 * 업무 앱 디렉터리가 하나도 남지 않은 기능은 present: false 다.
 */
export function treeDeletionCatalog(root) {
  root = resolve(root);
  const manifest = JSON.parse(readFileSync(join(root, MANIFEST), 'utf8'));
  const domains = [...new Set(Object.values(manifest.packs ?? {}).flatMap(pack => pack.backend?.appDomains ?? []))].sort();
  const known = new Set(domains);
  const requires = new Map(domains.map(domain => [domain, new Map()]));
  const add = (from, to, kind) => { if (to !== from && known.has(to)) requires.get(from).set(`${to}\u0000${kind}`, { domain: to, kind }); };
  for (const absolute of javaFiles(join(root, APP_ROOT))) {
    const domain = appSourceDomain(relative(root, absolute).split(sep).join('/'));
    if (!known.has(domain)) continue;
    for (const referenced of javaDomainReferences(readFileSync(absolute, 'utf8'))) add(domain, referenced, 'java');
  }
  for (const pack of Object.values(manifest.packs ?? {})) for (const [domain, files] of Object.entries(pack.backend?.domainSupportFiles ?? {})) {
    if (!known.has(domain)) continue;
    for (const file of Array.isArray(files) ? files : []) {
      const directoryDomain = typeof file === 'string' ? supportFileDirectoryDomain(file) : null;
      if (directoryDomain) add(domain, directoryDomain, 'java');
    }
  }
  for (const domain of domains) for (const { domain: required } of clusterRequirements(manifest, domain)) add(domain, required, 'manifest');
  return { capabilities: domains.map(id => ({ id,
    present: ['domain', 'service'].some(layer => existsSync(join(root, APP_ROOT, layer, id))),
    requires: [...requires.get(id).values()].sort((left, right) => (`${left.domain}\u0000${left.kind}` < `${right.domain}\u0000${right.kind}` ? -1 : 1))
      .map(edge => ({ ...edge, userReason: REQUIRES_USER_REASONS[`${id}>${edge.domain}`] ?? null })) })) };
}

/** JSON 을 ASCII 만으로 적는다. */
export function asciiJson(value) {
  // u 플래그를 두지 않는다. BMP 밖 문자는 서로게이트 반쪽마다 따로 적혀야 올바른 JSON 이다.
  return JSON.stringify(value).replace(/[\u007f-\uffff]/g, character => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const args = process.argv.slice(2);
  const mode = args.shift();
  let root = resolve(fileURLToPath(new URL('..', import.meta.url)));
  if (args[0] === '--root') { args.shift(); root = resolve(args.shift() ?? ''); }
  if (mode !== '--json' || !args.length) {
    console.error('사용법: node scripts/domain-deletion-plan.mjs --json [--root <저장소>] <도메인> [<도메인>...]');
    process.exit(2);
  }
  try {
    process.stdout.write(`${asciiJson(planDomainDeletion({ catalog: treeDeletionCatalog(root), requested: args }))}\n`);
  } catch (error) {
    console.error(`[domain-deletion-plan] ${error.message}`);
    process.exit(1);
  }
}
