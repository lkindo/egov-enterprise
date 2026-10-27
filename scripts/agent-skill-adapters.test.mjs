import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import { ADAPTER_ROOTS, adapterDrift, expectedAdapters, frontmatterFields, writeAdapters } from './agent-skill-adapters.mjs';

const repoRoot = join(import.meta.dirname, '..');

function fixtureRepo(files) {
  const root = mkdtempSync(join(tmpdir(), 'agent-skill-adapters-'));
  execFileSync('git', ['init', '-q'], { cwd: root });
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), content);
  }
  return root;
}

const folded = '﻿---\r\nname: mapper\r\ndescription: >-\r\n  Builds a map\r\n  before a change.\r\nversion: 1.0.0\r\n---\r\n\r\n# Mapper\r\n';

test('정본 스킬마다 두 경로에 이름·설명·정본 위치만 담은 안내 파일을 만든다', () => {
  const root = fixtureRepo({ '.agent/skills/mapper/SKILL.md': folded, '.agent/skills/mapper/scripts/run.mjs': '' });
  try {
    writeAdapters(root);
    for (const adapterRoot of ADAPTER_ROOTS) {
      const text = readFileSync(join(root, adapterRoot, 'mapper/SKILL.md'), 'utf8');
      assert.match(text, /^---\nname: mapper\ndescription: >-\n {2}Builds a map\n {2}before a change\.\n---\n/u, '접힌 설명이 원문 그대로 실려야 합니다.');
      assert.doesNotMatch(text, /version:/u, '안내 파일은 name·description 만 싣습니다.');
      assert.match(text, /\.\.\/\.\.\/\.\.\/\.agent\/skills\/mapper\/SKILL\.md/u);
    }
    assert.deepEqual(adapterDrift(root), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('빠지거나 낡거나 정본이 사라진 안내 파일을 잡고, 쓰기는 남은 안내 폴더를 지운다', () => {
  const root = fixtureRepo({ '.agent/skills/mapper/SKILL.md': folded, '.agent/skills/gone/SKILL.md': '---\nname: gone\ndescription: x\n---\n' });
  try {
    writeAdapters(root);
    rmSync(join(root, '.agent/skills/gone'), { recursive: true });
    writeFileSync(join(root, '.claude/skills/mapper/SKILL.md'), 'edited by hand');
    rmSync(join(root, '.agents/skills/mapper/SKILL.md'));
    assert.deepEqual(adapterDrift(root), [
      '빠짐: .agents/skills/mapper/SKILL.md',
      '낡음: .claude/skills/mapper/SKILL.md',
      '남음: .agents/skills/gone/SKILL.md',
      '남음: .claude/skills/gone/SKILL.md',
    ]);
    writeAdapters(root);
    assert.deepEqual(adapterDrift(root), []);
    assert.equal(existsSync(join(root, '.agents/skills/gone')), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('안내 경로에 직접 쓴 스킬은 지우지 않고 멈춘다', () => {
  const root = fixtureRepo({
    '.agent/skills/mapper/SKILL.md': folded,
    '.agents/skills/native/SKILL.md': '---\nname: native\ndescription: written here\n---\n',
  });
  try {
    assert.throws(() => writeAdapters(root), /생성물이 아님: \.agents\/skills\/native\/SKILL\.md/u);
    assert.equal(existsSync(join(root, '.agents/skills/native/SKILL.md')), true, '직접 쓴 스킬을 지우면 안 됩니다.');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('폴더 이름과 다른 name·머리가 없는 SKILL.md 는 거부하고, 무시된 정본은 노출하지 않는다', () => {
  assert.throws(() => frontmatterFields('# no head', 'x'), /머리/u);
  const mismatch = fixtureRepo({ '.agent/skills/mapper/SKILL.md': '---\nname: other\ndescription: x\n---\n' });
  const ignored = fixtureRepo({ '.gitignore': '.agent/skills/pdf/\n', '.agent/skills/pdf/SKILL.md': '---\nname: pdf\ndescription: x\n---\n' });
  try {
    assert.throws(() => expectedAdapters(mismatch), /폴더 이름/u);
    assert.equal(expectedAdapters(ignored).size, 0, '추적하지 않는 재배포 제한 스킬(DEC-OPS-182)이 안내 파일로 새면 안 됩니다.');
  } finally {
    rmSync(mismatch, { recursive: true, force: true });
    rmSync(ignored, { recursive: true, force: true });
  }
});

test('저장소의 .gitignore 는 안내 파일·훅 어댑터를 추적하고 로컬 산출물은 무시한다', () => {
  const ignored = (file) => {
    try {
      execFileSync('git', ['check-ignore', '--quiet', '--no-index', '--', file], { cwd: repoRoot });
      return true;
    } catch (error) {
      if (error.status === 1) return false;
      throw error;
    }
  };
  for (const file of ['.agents/skills/db-governance/SKILL.md', '.claude/skills/db-governance/SKILL.md',
    '.agents/hooks.json', '.codex/hooks.json', '.claude/settings.json']) {
    assert.equal(ignored(file), false, `${file}: 추적해야 하는 파일이 무시됩니다.`);
  }
  for (const file of ['.agents/teamwork/sentinel/handoff.md', 'frontend/.agents/teamwork/x.md', '.codex/config.toml',
    '.claude/settings.local.json', '.claude/worktrees/wt/README.md']) {
    assert.equal(ignored(file), true, `${file}: 로컬 산출물이 추적됩니다.`);
  }
});
