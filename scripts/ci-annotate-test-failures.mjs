#!/usr/bin/env node
/**
 * 실패한 JUnit 테스트의 클래스·메시지를 GitHub error annotation 으로 노출한다.
 *
 * [2026-09-23] 종전에는 ci.yml 안의 셸 한 줄이 이 일을 했고, 메시지 추출 패턴이
 * `message="[^"]\{0,300\}"` 였다 — **닫는 따옴표가 300자 안에 있어야** 매칭된다.
 * 그래서 메시지가 길면 추출이 빈 문자열이 되고, 본문이 빈 annotation 은 GitHub 가 버린다.
 *
 * 결과가 정확히 거꾸로였다 — 짧은 단언 실패는 보이고, **Flyway·SQL 예외처럼 길어서 정말
 * 진단이 필요한 실패는 보이지 않았다.** 2026-09-23 schemaValidationTest 간헐 실패에서
 * 실패 클래스 annotation 이 하나도 뜨지 않은 원인이 이것이다(로컬 재현 확인).
 *
 * 여기서는 닫는 따옴표를 요구하지 않고 읽은 뒤 자른다. 메시지가 없으면 예외 타입으로,
 * 그것도 없으면 명시적 표지로 물러나 **annotation 이 조용히 사라지지 않게** 한다.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const MAX_FILES = 5;
export const MAX_MESSAGES = 2;
export const MAX_DETAIL = 300;
export const NO_DETAIL = '(메시지 속성이 없다 — 리포트 XML 을 직접 확인한다)';

/** GitHub workflow command 는 `%`·CR·LF 를 이스케이프해야 한 줄로 전달된다. */
export function escapeAnnotation(value) {
  return String(value).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

function collectXml(root, out, depth = 0) {
  if (depth > 6) return;
  let entries;
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(root, entry.name);
    if (entry.isDirectory()) collectXml(full, out, depth + 1);
    else if (entry.isFile() && entry.name.endsWith('.xml')) out.push(full);
  }
}

/** `<module>/build/test-results` 아래의 JUnit XML 을 경로 순으로 모은다. */
export function findResultFiles(repoRoot) {
  const files = [];
  let modules;
  try {
    modules = readdirSync(repoRoot, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const module of modules) {
    if (!module.isDirectory()) continue;
    const dir = join(repoRoot, module.name, 'build', 'test-results');
    try {
      if (!statSync(dir).isDirectory()) continue;
    } catch {
      continue;
    }
    collectXml(dir, files);
  }
  return files.sort();
}

/**
 * 실패 상세를 뽑는다. 닫는 따옴표를 창 안에서 요구하지 않고, 읽은 뒤 자른다 —
 * 그래야 긴 예외 메시지가 조용히 빈 문자열이 되지 않는다.
 */
export function extractDetail(xml) {
  const pick = (attribute) => [...xml.matchAll(new RegExp(`${attribute}="([^"]*)`, 'g'))]
    .slice(0, MAX_MESSAGES)
    .map((match) => match[1].slice(0, MAX_DETAIL))
    .filter((value) => value.trim().length > 0);

  const messages = pick('message');
  if (messages.length) return messages.join('\n');
  const types = pick('type');
  if (types.length) return types.join('\n');
  return NO_DETAIL;
}

export function hasFailure(xml) {
  return xml.includes('<failure') || xml.includes('<error message');
}

export function className(file) {
  const base = file.split(/[\\/]/).pop() ?? file;
  return base.replace(/\.xml$/, '').replace(/^TEST-/, '');
}

/** 실패한 리포트마다 annotation 한 줄을 만든다. 본문은 절대 비지 않는다. */
export function buildAnnotations(repoRoot, { readFile = (f) => readFileSync(f, 'utf8') } = {}) {
  const lines = [];
  for (const file of findResultFiles(repoRoot)) {
    if (lines.length >= MAX_FILES) break;
    let xml;
    try {
      xml = readFile(file);
    } catch {
      continue;
    }
    if (!hasFailure(xml)) continue;
    const detail = extractDetail(xml);
    lines.push(`::error title=테스트 실패: ${escapeAnnotation(className(file))}::${escapeAnnotation(detail)}`);
  }
  return lines;
}

const invokedDirectly = process.argv[1]
  && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href;
if (invokedDirectly) {
  for (const line of buildAnnotations(process.argv[2] ?? process.cwd())) console.log(line);
}
