#!/usr/bin/env node
/**
 * 수동 도메인 삭제(scripts/delete-domain.ps1)의 동반 삭제 판정.
 *
 * 생성기와 같은 카탈로그의 requires 간선을 거꾸로 따라간다. 지우는 기능을 요구하는 기능은 함께 지운다 —
 * 남기면 컴파일되지 않거나, 주입받을 구현이 사라져 기동하지 않거나, 함께 생성하라는 묶음 선언을 어긴다.
 * 지우는 기능이 요구하는 기능은 남긴다. 그쪽은 지운 기능 없이도 선다.
 *
 * 화면을 같이 쓰는 데서 나온 간선(customOnly — 공동 화면·화면 참조)은 보지 않는다. 그 간선은 직접 선택 생성에서
 * 어떤 화면을 남길지 정하는 데만 쓰고, delete-domain 은 화면을 pack 단위로만 지운다.
 *
 * 종전 delete-domain 은 manifest clusters 를 방향 없이 고정점으로 넓혔다. 코드 참조·지원 파일 간선을 보지 않아
 * 템플릿만 지우면 커뮤니티가 쓰는 템플릿 배정 구현이 함께 지워졌고, 묶음에서 근거 없는 간선을 걷으면
 * 게시판·결재를 지울 때 그 기능을 요구하는 스크랩·행사가 남았다.
 *
 * 사용: node scripts/domain-deletion-plan.mjs --json <도메인> [<도메인>...]
 * 출력 JSON 의 비 ASCII 문자는 \uXXXX 로 적는다. 콘솔 코드 페이지와 관계없이 PowerShell 이 같은 값을 읽는다.
 */
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadProjectComposerCatalog } from './project-composer-catalog.mjs';

/**
 * @param {{ catalog: { capabilities: { id: string, requires: { domain: string, kind: string, customOnly?: boolean, userReason?: string }[] }[] }, requested: string[] }} input
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
      if (deleting.has(capability.id)) continue;
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

/** JSON 을 ASCII 만으로 적는다. */
export function asciiJson(value) {
  // u 플래그를 두지 않는다. BMP 밖 문자는 서로게이트 반쪽마다 따로 적혀야 올바른 JSON 이다.
  return JSON.stringify(value).replace(/[\u007f-\uffff]/g, character => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const [mode, ...requested] = process.argv.slice(2);
  if (mode !== '--json' || !requested.length) {
    console.error('사용법: node scripts/domain-deletion-plan.mjs --json <도메인> [<도메인>...]');
    process.exit(2);
  }
  try {
    const catalog = loadProjectComposerCatalog(resolve(fileURLToPath(new URL('..', import.meta.url))));
    process.stdout.write(`${asciiJson(planDomainDeletion({ catalog, requested }))}\n`);
  } catch (error) {
    console.error(`[domain-deletion-plan] ${error.message}`);
    process.exit(1);
  }
}
