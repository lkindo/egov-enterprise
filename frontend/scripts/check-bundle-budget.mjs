#!/usr/bin/env node

/**
 * Next 프로덕션 산출물 크기 래칫.
 *
 * Lighthouse는 실제 페이지 경험을 측정하지만 실행 환경 편차가 크다. 이 게이트는 그와 별도로
 * 정적 JS/CSS 전체와 단일 청크의 gzip 크기를 매 빌드에서 결정론적으로 제한한다. 예산은
 * 실측 기준에 약 10% 여유를 둔다.
 * 임계를 올리는 대신 새 의존의 필요성, dynamic import, 공통 레이아웃 유입부터 점검할 것.
 *
 * ## 실측 기준(갱신 시 날짜와 함께 남길 것)
 *
 * | 측정일 | JS 합계 | JS 최대 | CSS 합계 | CSS 최대 |
 * |---|---|---|---|---|
 * | 2026-08-12 | 2,048,260B | 133,566B | 35,223B | 34,200B |
 * | 2026-09-03 | 2,201,553B | 133,489B | 35,048B | 34,025B |
 *
 * [2026-09-03] **JS 합계가 3주 만에 +153,293B(+7.5%) 늘어 설계 여유 10% 중 78%를 먹었다**
 * (남은 여유 2.2%). 종전에는 이 사실이 어디에도 드러나지 않았다 — 스크립트가 여유 50% 일 때와
 * 97.8% 를 쓴 때에 **똑같이 ✅ 만 찍었기** 때문이다. 그래서 사용률·남은 여유를 항상 출력하고,
 * 정책 하한 미만이면 경고를 낸다. 경고는 차단하지 않는다 — 해소 방향(번들 축소 vs 예산 재산정)은
 * frontend-platform 소유자의 결정이고, 이 스크립트가 대신 정할 일이 아니다.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const CHUNK_ROOT = path.resolve('.next/static/chunks');
const BUDGETS = {
  js: { total: 2_250_000, single: 150_000 },
  css: { total: 40_000, single: 38_000 },
};

/**
 * 위 docstring 의 "약 10% 여유" 정책을 실행 가능한 값으로 옮긴 것. 남은 여유가 이 아래로
 * 내려가면 경고한다.
 *
 * ⚠ 경고를 없애려고 이 값을 낮추는 것은 수정이 아니라 은폐다(AGENTS.md H2).
 * 여유가 줄었다는 사실 자체가 신호이며, 해소는 번들을 줄이거나 예산을 **사유와 함께** 재산정하는 것이다.
 */
const HEADROOM_FLOOR = 0.1;

function headroomOf(actual, budget) {
  return { remaining: budget - actual, ratio: (budget - actual) / budget };
}

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

function formatHeadroom({ remaining, ratio }) {
  return `${(ratio * 100).toFixed(1)}% · ${formatBytes(remaining)}`;
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
    const totalHeadroom = headroomOf(result.total, budget.total);
    const singleHeadroom = headroomOf(largest.gzip, budget.single);
    const label = extension.toUpperCase();
    console.log(
      `${label}: ${result.rows.length}개 · gzip 합계 ${formatBytes(result.total)}`
      + `/${formatBytes(budget.total)} (여유 ${formatHeadroom(totalHeadroom)})`
      + ` · 최대 ${formatBytes(largest.gzip)}`
      + `/${formatBytes(budget.single)} (여유 ${formatHeadroom(singleHeadroom)}, ${largest.file})`,
    );

    // 예산 안이어도 여유가 정책 하한 밑으로 내려갔으면 그 사실을 드러낸다 —
    // 초과한 뒤에야 알게 되면 그때는 이미 어느 변경이 원인인지 가리기 어렵다.
    for (const [axis, headroom] of [['합계', totalHeadroom], ['단일 청크', singleHeadroom]]) {
      if (headroom.ratio >= HEADROOM_FLOOR || headroom.remaining < 0) continue;
      console.warn(
        `⚠ ${label} ${axis} 여유 ${formatHeadroom(headroom)} — 정책 하한 `
        + `${(HEADROOM_FLOOR * 100).toFixed(0)}% 미만입니다(차단하지 않음).\n`
        + '   임계를 올리기 전에 새 의존의 필요성·dynamic import·공통 레이아웃 유입을 점검하십시오.',
      );
    }

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
