#!/usr/bin/env node

/**
 * Next 프로덕션 산출물 크기 래칫.
 *
 * Lighthouse는 실제 페이지 경험을 측정하지만 실행 환경 편차가 크다. 이 게이트는 그와 별도로
 * 정적 JS/CSS 전체와 단일 청크의 gzip 크기를 매 빌드에서 결정론적으로 제한한다. 현재 기준
 * (2026-08-12: JS 2,048,260B/최대 133,566B, CSS 35,223B/최대 34,200B)에 약 10% 여유를 둔다.
 * 임계를 올리는 대신 새 의존의 필요성, dynamic import, 공통 레이아웃 유입부터 점검할 것.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const CHUNK_ROOT = path.resolve('.next/static/chunks');
const BUDGETS = {
  js: { total: 2_250_000, single: 150_000 },
  css: { total: 40_000, single: 38_000 },
};

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  }));
  return nested.flat();
}

function formatBytes(bytes) {
  return `${bytes.toLocaleString('en-US')}B`;
}

async function measure(extension) {
  const files = (await walk(CHUNK_ROOT)).filter((file) => file.endsWith(`.${extension}`));
  const rows = await Promise.all(files.map(async (file) => {
    const content = await readFile(file);
    return {
      file: path.relative(process.cwd(), file).split(path.sep).join('/'),
      gzip: gzipSync(content, { level: 9 }).byteLength,
    };
  }));
  rows.sort((left, right) => right.gzip - left.gzip);
  return {
    rows,
    total: rows.reduce((sum, row) => sum + row.gzip, 0),
  };
}

try {
  const violations = [];
  for (const extension of ['js', 'css']) {
    const result = await measure(extension);
    const budget = BUDGETS[extension];
    if (result.rows.length === 0) {
      violations.push(`${extension.toUpperCase()} 산출물이 0건 — next build 선행 여부를 확인하십시오.`);
      continue;
    }

    const largest = result.rows[0];
    console.log(
      `${extension.toUpperCase()}: ${result.rows.length}개 · gzip 합계 ${formatBytes(result.total)}`
      + `/${formatBytes(budget.total)} · 최대 ${formatBytes(largest.gzip)}`
      + `/${formatBytes(budget.single)} (${largest.file})`,
    );

    if (result.total > budget.total) {
      violations.push(
        `${extension.toUpperCase()} gzip 합계 ${formatBytes(result.total)}가 예산 ${formatBytes(budget.total)} 초과`,
      );
    }
    for (const row of result.rows.filter((candidate) => candidate.gzip > budget.single)) {
      violations.push(
        `${extension.toUpperCase()} 청크 ${row.file} ${formatBytes(row.gzip)}`
        + `가 단일 예산 ${formatBytes(budget.single)} 초과`,
      );
    }
  }

  if (violations.length > 0) {
    console.error(`\n❌ 번들 예산 초과:\n- ${violations.join('\n- ')}`);
    process.exit(1);
  }
  console.log('✅ 프로덕션 정적 자산이 고정 gzip 예산 안에 있습니다.');
} catch (error) {
  console.error(`❌ 번들 예산을 측정할 수 없습니다: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
