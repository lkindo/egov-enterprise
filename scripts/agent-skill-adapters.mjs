#!/usr/bin/env node
/**
 * 저장소 스킬을 에이전트마다 찾는 경로에 안내 파일로 노출한다.
 *
 * 스킬 정본은 `.agent/skills/<이름>/SKILL.md` 하나다. 그런데 도구마다 저장소 스킬을 찾는 경로가 다르다 —
 * Codex·Antigravity 는 `.agents/skills/`, Claude Code 는 `.claude/skills/` 만 본다(2026-10-27 각 도구 문서·설치본 실측).
 * 정본을 그대로 두고 두 경로에 이름·설명과 정본 위치만 담은 안내 파일을 만든다. 심볼릭 링크는 쓰지 않는다 —
 * 이 저장소는 core.symlinks=false 라 커밋한 링크가 clone·작업 트리에서 경로 문자열 파일로 풀린다.
 *
 * 사용법:
 *   node scripts/agent-skill-adapters.mjs --write   # 안내 파일을 다시 쓰고, 정본이 사라진 안내 폴더를 지운다(npm run regen 이 부른다)
 *   node scripts/agent-skill-adapters.mjs --check   # 쓰지 않는다 — 빠졌거나 낡았거나 남은 안내 파일이 있으면 종료 코드 1
 *
 * 안내 폴더에는 이 생성기가 쓴 SKILL.md 만 둔다. 표지가 없는 파일이 있으면 지우지 않고 멈춘다 — 그 경로에 스킬을 직접 쓰면
 * 정본이 둘이 되므로 `.agent/skills/` 로 옮긴다.
 */
// node 내장만 쓴다 — merge-main-regenerate.mjs 가 출력 목록을 얻으려고 이 모듈을 불러온다(병합 중에도 시작할 수 있어야 한다).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Git 이 보는 정본 스킬 파일(추적·무시되지 않은 새 파일). 재배포 제한 스킬처럼 무시된 로컬 사본은 빠진다. */
function sourceSkillFiles(cwd) {
  const result = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', SOURCE_ROOT],
    { cwd, encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error(`git ls-files 실패: ${result.stderr}`);
  return result.stdout.split('\0').filter(Boolean);
}
export const SOURCE_ROOT = '.agent/skills';
export const ADAPTER_ROOTS = Object.freeze(['.agents/skills', '.claude/skills']);
const MARKER = '<!-- npm run regen 이 만든 안내 파일이다(scripts/agent-skill-adapters.mjs). 고치려면 정본을 고친다. -->';

const lf = (text) => text.replace(/^﻿/u, '').replace(/\r\n/g, '\n');

/** SKILL.md 머리에서 name 줄과 description 블록(접힌 여러 줄 포함)을 원문 그대로 꺼낸다. */
export function frontmatterFields(text, label) {
  const head = /^---\n([\s\S]*?)\n---(?:\n|$)/u.exec(lf(text))?.[1];
  if (head === undefined) throw new Error(`${label}: SKILL.md 머리(--- … ---)가 없다`);
  const lines = head.split('\n');
  const block = (key) => {
    const start = lines.findIndex((line) => line.startsWith(`${key}:`));
    if (start < 0) return null;
    let end = start + 1;
    while (end < lines.length && /^[ \t]/u.test(lines[end])) end += 1;
    return lines.slice(start, end).join('\n');
  };
  const nameLine = block('name');
  const description = block('description');
  if (!nameLine || !description) throw new Error(`${label}: SKILL.md 머리에 name·description 이 둘 다 있어야 한다`);
  const name = nameLine.slice('name:'.length).trim().replace(/^(['"])(.*)\1$/u, '$2');
  return { name, description };
}

export function renderAdapter({ name, description }) {
  return [
    '---',
    `name: ${name}`,
    description,
    '---',
    '',
    MARKER,
    '',
    `이 스킬의 정본은 [\`${SOURCE_ROOT}/${name}/SKILL.md\`](../../../${SOURCE_ROOT}/${name}/SKILL.md) 다. 그 파일을 끝까지 읽고 따른다 — 함께 둔 스크립트·참고 파일도 그 폴더 기준이다.`,
    '',
  ].join('\n');
}

/** Git 이 보는(무시되지 않은) 정본 스킬마다 기대하는 안내 파일. 경로는 저장소 기준 '/' 구분이다. */
export function expectedAdapters(cwd = ROOT, files = sourceSkillFiles(cwd)) {
  const sources = files
    .map((file) => file.replaceAll('\\', '/'))
    .filter((file) => file.startsWith(`${SOURCE_ROOT}/`) && /^[^/]+\/SKILL\.md$/u.test(file.slice(SOURCE_ROOT.length + 1)))
    .sort();
  const expected = new Map();
  for (const source of sources) {
    const dir = source.split('/')[2];
    let text;
    try {
      text = readFileSync(join(cwd, source), 'utf8');
    } catch (error) {
      // git ls-files --cached 는 아직 stage하지 않은 삭제·이름 변경의 옛 경로도 돌려준다.
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    const fields = frontmatterFields(text, source);
    if (fields.name !== dir) throw new Error(`${source}: name(${fields.name})이 폴더 이름(${dir})과 다르다 — 도구들이 스킬을 폴더 이름으로 찾는다`);
    const content = renderAdapter(fields);
    for (const root of ADAPTER_ROOTS) expected.set(`${root}/${dir}/SKILL.md`, content);
  }
  return expected;
}

/** 안내 폴더에 지금 있는 파일(저장소 기준 경로). */
function presentAdapterFiles(cwd) {
  const present = [];
  for (const root of ADAPTER_ROOTS) {
    const base = join(cwd, root);
    if (!existsSync(base)) continue;
    for (const entry of readdirSync(base, { withFileTypes: true })) {
      if (!entry.isDirectory()) { present.push(`${root}/${entry.name}`); continue; }
      for (const file of readdirSync(join(base, entry.name))) present.push(`${root}/${entry.name}/${file}`);
    }
  }
  return present.sort();
}

export function adapterDrift(cwd = ROOT, expected = expectedAdapters(cwd)) {
  const problems = [];
  for (const [file, content] of expected) {
    let current;
    try {
      current = readFileSync(join(cwd, file), 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      problems.push(`빠짐: ${file}`);
      continue;
    }
    if (lf(current) !== content) problems.push(`낡음: ${file}`);
  }
  for (const file of presentAdapterFiles(cwd)) {
    if (expected.has(file)) continue;
    const isGenerated = file.endsWith('/SKILL.md') && lf(readFileSync(join(cwd, file), 'utf8')).includes(MARKER);
    problems.push(isGenerated ? `남음: ${file}` : `생성물이 아님: ${file} — 스킬 정본은 ${SOURCE_ROOT}/ 에 둔다`);
  }
  return problems;
}

export function writeAdapters(cwd = ROOT, expected = expectedAdapters(cwd)) {
  const foreign = adapterDrift(cwd, expected).filter((problem) => problem.startsWith('생성물이 아님'));
  if (foreign.length) throw new Error(foreign.join('\n'));
  for (const file of presentAdapterFiles(cwd)) {
    if (!expected.has(file)) rmSync(join(cwd, dirname(file)), { recursive: true, force: true });
  }
  for (const [file, content] of expected) {
    mkdirSync(dirname(join(cwd, file)), { recursive: true });
    writeFileSync(join(cwd, file), content);
  }
}

/** merge-main-regenerate.mjs 의 GENERATORS 가 재생성 충돌을 풀 때 쓰는 출력 목록. */
export function adapterOutputs(cwd = ROOT) {
  try {
    return [...expectedAdapters(cwd).keys()];
  } catch {
    return [...ADAPTER_ROOTS];
  }
}

function main(argv) {
  const mode = argv[0];
  if (mode === '--write') {
    writeAdapters();
    console.log(`[agent-skill-adapters] 안내 파일 ${expectedAdapters().size}개를 썼다(${ADAPTER_ROOTS.join(', ')}).`);
    return 0;
  }
  if (mode === '--check') {
    const problems = adapterDrift();
    if (!problems.length) return 0;
    console.error(['[agent-skill-adapters] 스킬 안내 파일이 정본과 다르다 — npm run regen 으로 다시 만든다.', ...problems].join('\n'));
    return 1;
  }
  console.error('사용법: node scripts/agent-skill-adapters.mjs --write | --check');
  return 2;
}

if (process.argv[1] && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  process.exitCode = main(process.argv.slice(2));
}
