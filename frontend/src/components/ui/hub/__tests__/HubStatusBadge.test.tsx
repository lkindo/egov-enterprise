/**
 * HubStatusBadge — 서로 다른 상태가 **서로 다르게 보이는가**.
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * 이 컴포넌트는 `status` 문자열만 받으면 내부 목록(`활성`·`PUBLISHED`·`PENDING` …)으로
 * variant 를 자동 판정한다. 그 목록에 없는 문구는 **조용히 default(`bg-muted`)로 떨어진다.**
 *
 * 2026-09-22 실측에서 두 화면이 정확히 그 경로에 있었다.
 *   · 공통코드 상세 코드 — `'사용 중'` / `'미사용'`
 *   · 배너·팝업 게시 상태 — `'게시 중'` / `'대기 중'`
 * 네 문구 모두 목록 밖이라 **켜짐과 꺼짐이 같은 회색 배지로 렌더**됐고, 배지 열은
 * 사용자에게 아무것도 구분해 주지 않으면서 자리만 차지했다.
 *
 * 그래서 두 화면은 `variant` 를 명시해 의미를 자기 자리에서 선언하도록 고쳤다. 아래 첫 테스트가
 * 그 결과를, 두 번째 테스트가 **왜 명시가 필요한지**(목록 의존이 실제로 무너진다) 고정한다.
 *
 * ⚠ 두 번째 테스트는 현재 동작을 옳다고 말하는 것이 아니라 **위험이 실재함**을 증거로 남기는
 *   대조군이다. 자동 판정 목록을 넓혀 해결하려 들면 다음 화면이 새 문구를 지어낼 때 같은 사고가
 *   반복되므로, 해법은 목록 확장이 아니라 호출부의 명시다.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HubStatusBadge } from '../HubStatusBadge';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

function classesOf(ui: React.ReactElement): string {
  const { container } = render(ui);
  const badge = container.querySelector('.hub-badge-status');
  if (!badge) throw new Error('배지 루트를 찾지 못했습니다');
  return badge.className;
}

describe('HubStatusBadge — 상태 구분', () => {
  it.each([
    ['공통코드', '사용 중', '미사용'],
    ['배너·팝업', '게시 중', '대기 중'],
  ])('%s 의 켜짐·꺼짐은 서로 다르게 렌더된다', (_screen, onLabel, offLabel) => {
    const on = classesOf(<HubStatusBadge status={onLabel} variant="success" />);
    const off = classesOf(<HubStatusBadge status={offLabel} variant="secondary" />);

    expect(on).not.toBe(off);
    expect(on).toContain('bg-success/15');
    expect(off).toContain('bg-muted');
  });

  it('자동 판정 목록 밖 문구를 status 로만 넘기면 두 상태가 같아진다(위험 대조군)', () => {
    // variant 를 생략하면 네 문구가 전부 default 로 떨어진다 — 이것이 위 화면들의 원래 결함이다.
    const cases = ['사용 중', '미사용', '게시 중', '대기 중']
      .map((status) => classesOf(<HubStatusBadge status={status} />));

    expect(new Set(cases).size, '목록 밖 문구가 서로 구분되면 이 대조군은 의미를 잃는다').toBe(1);
    expect(cases[0]).toContain('bg-muted');
  });

  it('목록에 있는 문구는 자동 판정이 그대로 동작한다', () => {
    // 행정 구역 코드가 쓰는 '활성' 은 success 목록에 있어 우연히 구분되고 있었다.
    expect(classesOf(<HubStatusBadge status="활성" />)).toContain('bg-success/15');
    expect(classesOf(<HubStatusBadge status="중단" />)).toContain('bg-muted');
  });

  /**
   * 호출부 잠금 — 어휘 목록을 유지하는 대신 **규칙 하나**로 일반화한다.
   *
   * 자동 판정에 기대면 "이 문구가 목록에 있는가" 를 화면마다 사람이 기억해야 하고, 틀려도
   * 조용히 회색 배지가 나올 뿐이라 아무 신호가 없다. variant 를 언제나 명시하게 하면 그 기억이
   * 불필요해지고, 빠뜨리면 여기서 파일·라인을 지목하며 red 가 된다.
   */
  it('생산 호출부는 variant 를 명시한다', () => {
    const files = (function walk(directory: string): string[] {
      return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) return entry.name === '__tests__' ? [] : walk(path);
        if (!entry.name.endsWith('.tsx') || entry.name.endsWith('.test.tsx')) return [];
        return [path];
      });
    })(SRC);

    const missing = files.flatMap((path) => {
      const source = readFileSync(path, 'utf8');
      // `<HubStatusBadge` 부터 그 태그를 닫는 `/>` 또는 `>` 까지를 한 사용처로 본다.
      return [...source.matchAll(/<HubStatusBadge\b[\s\S]*?\/?>/g)]
        .filter((match) => !/\bvariant\s*=/.test(match[0]))
        .map((match) => `${relative(SRC, path).split(sep).join('/')}:${source.slice(0, match.index).split('\n').length}`);
    });

    expect(
      missing,
      `variant 를 명시하지 않은 HubStatusBadge 사용처:\n${missing.join('\n')}\n`
        + 'status 문구가 자동 판정 목록 밖이면 켜짐·꺼짐이 같은 회색으로 렌더된다.',
    ).toEqual([]);
  });
});
