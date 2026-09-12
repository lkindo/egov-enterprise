/**
 * §A3-1 모달 이행 라우트로의 **역참조 0건**을 고정한다(DEC-OPS-079).
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * 전용 입력 페이지를 목록 위 모달로 옮기면서 네 라우트를 page-redirect 로 바꿨다. 그런데
 * 그 라우트를 **가리키던 화면들**은 그대로 남았고, 그 결과가 전부 "눌러도 원하는 일이
 * 일어나지 않는" 어포던스였다(G10). 실측된 회귀 3종:
 *
 *   - 설문 허브 '만족도 조사 등록' → `/admin/survey/manage/create` → 목록 → (next.config)
 *     다시 허브. 즉 **제자리로 돌아올 뿐 등록 폼이 열리지 않았다.**
 *   - 협업 허브 '스크랩 등록' → `insertScrap` → 스크랩 목록. 등록이라 적힌 버튼이 목록으로 떨어졌다.
 *   - 협업 허브 스크랩 **행 클릭** → `selectScrapDetail/{scrapSn}` → 목록. 어느 스크랩을
 *     눌렀는지 **식별자가 통째로 버려졌다** — 가장 조용한 형태다.
 *
 * 셋 다 타입 검사·린트·기존 계약 어디에도 걸리지 않았다. 목적지가 문자열이고, 리다이렉트가
 * 200 을 돌려주기 때문이다. 그래서 문자열 수준에서 막는다.
 *
 * ── 범위 ────────────────────────────────────────────────────────────────────
 * 이 가드는 §A3-1 로 이행한 네 라우트만 본다. "page-redirect 인 모든 라우트" 로 일반화하려면
 * Next 의 라우트 해석(정적 세그먼트가 동적 세그먼트를 이긴다)을 구현해야 한다 — 실측에서
 * `/admin/community/boards/[id]` 가 page-redirect 라는 이유로 형제 정적 라우트
 * (`detail`·`master`·`select-board-list`)까지 위반으로 잡히는 오탐이 21건 나왔다.
 * 그 일반 게이트는 별도 과제이며, 여기서는 회귀가 실제로 난 축만 정확히 고정한다.
 */

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const APP = path.resolve(__dirname, '..', 'app');

/** DEC-OPS-079 로 목록 위 모달에 흡수돼 page-redirect 만 남은 라우트. */
const MIGRATED_ROUTES = [
  '/admin/collaboration/address-book/insert-address-book',
  '/admin/collaboration/scraps/insertScrap',
  '/admin/collaboration/scraps/selectScrapDetail',
  '/admin/survey/manage/create',
] as const;

/** 자기 자신의 redirect 파일은 목적지를 알아야 하므로 제외한다. */
const REDIRECT_PAGES = new Set(
  MIGRATED_ROUTES.map((route) => path.join(APP, ...route.split('/').filter(Boolean))),
);

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');

function collectSources(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') continue;
      collectSources(full, acc);
      continue;
    }
    if (!/\.tsx?$/.test(entry.name)) continue;
    if (/\.test\.tsx?$/.test(entry.name)) continue;
    acc.push(full);
  }
  return acc;
}

describe('§A3-1 이행 라우트는 어떤 화면도 다시 가리키지 않는다', () => {
  it('생산 코드에 퇴역한 전용 입력 라우트로의 내비게이션이 없다', () => {
    const offenders: string[] = [];

    for (const file of collectSources(APP)) {
      // 대상 라우트의 redirect 파일 자신(과 그 하위 [id]/page.tsx)은 목적지 문자열을 갖는다.
      if ([...REDIRECT_PAGES].some((base) => file.startsWith(base))) continue;

      const source = stripComments(fs.readFileSync(file, 'utf8'));
      for (const route of MIGRATED_ROUTES) {
        if (source.includes(route)) {
          offenders.push(`${path.relative(APP, file).replace(/\\/g, '/')} → ${route}`);
        }
      }
    }

    expect(
      offenders,
      [
        '퇴역한 전용 입력 라우트를 가리키는 화면이 있습니다. 그 라우트는 목록으로 보내는',
        'page-redirect 라서 누르면 등록 폼이 열리지 않고, 식별자를 실어 보냈다면 그 값도 버려집니다.',
        '목록이 소유한 모달(AddressBookCreateDialog · ScrapFormDialog · SurveyFormDialog)을 직접 여세요.',
      ].join(' '),
    ).toEqual([]);
  });

  it('가드가 공허하지 않다 — 합성 위반을 실제로 잡는다', () => {
    /*
      검사 대상이 0개이거나 매칭이 죽어 있으면 위 테스트는 무엇을 하든 통과한다.
      같은 판정 로직에 합성 소스를 넣어 red 가 되는지 확인한다.
    */
    const synthetic = stripComments(`
      // 아래 한 줄이 회귀다 — 주석이 아니라 코드여야 잡힌다.
      const go = () => router.push('/admin/collaboration/scraps/insertScrap');
    `);
    const commentOnly = stripComments(`
      // router.push('/admin/collaboration/scraps/insertScrap') 는 더 이상 쓰지 않는다.
      const go = () => openScrapCreate();
    `);

    expect(MIGRATED_ROUTES.some((route) => synthetic.includes(route))).toBe(true);
    expect(MIGRATED_ROUTES.some((route) => commentOnly.includes(route))).toBe(false);
  });
});
